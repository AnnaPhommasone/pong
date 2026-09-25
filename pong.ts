import { interval, fromEvent } from 'rxjs'
import { map, scan, filter, merge } from 'rxjs/operators'

function pong() {
  // This class makes it easier to access and update these varaibles that are used many times
  const Constants = new class {
    readonly CanvasSize = 600;
    readonly StartTime = 0;
    readonly PaddleWidth = 10;
    readonly PaddleHeight = 40;
    readonly BallSize = 10;
  }();

  type Key = "ArrowUp" | "ArrowDown";
  type Event = "keydown" | "keyup";
  type ViewType = "paddle" | "ball";

  // These classes are needed because reduceState() differentiates between elements from the stream using instanceof
  class Tick { constructor(public readonly elapsed: number) { } }
  class Slide { constructor(public readonly length: number) { } }

  // This function reduces code by creating Observables for the given event (keydown/keyup) and key (up/down)
  const keyObservable = <T>(e: Event, k: Key, result: () => T) =>
    fromEvent<KeyboardEvent>(document, e)
      .pipe(
        filter(({ code }) => code === k),
        filter(({ repeat }) => !repeat),
        map(result));
  const startUpSlide = keyObservable("keydown", "ArrowUp", () => new Slide(-20));
  const stopUpSlide = keyObservable("keyup", "ArrowUp", () => new Slide(0));
  const startDownSlide = keyObservable("keydown", "ArrowDown", () => new Slide(20));
  const stopDownSlide = keyObservable("keyup", "ArrowDown", () => new Slide(0));

  // The Body data types represents both paddles and the ball
  type Body = Readonly<{
    id: string;
    viewType: ViewType;
    pos: Vec;
    vel: Vec;
    height: number;
    width: number;
    createTime: number;
  }>;

  // Represents the current state of the program.
  type State = Readonly<{
    time: number;
    rightPaddle: Body;
    leftPaddle: Body;
    ball: Body;
    leftPlayerPoints: number;
    rightPlayerPoints: number;
    gameOver: boolean;
  }>

  // Creates a Body that represents a paddle.
  // name and pos are parameters to differentiate between the two paddles.
  const createPaddle = (name: string) => (pos: Vec) => <Body>{
    id: name + "Paddle",
    viewType: "paddle",
    pos: pos,
    vel: Vec.Zero,
    height: Constants.PaddleHeight,
    width: Constants.PaddleWidth,
    createTime: Constants.StartTime
  }

  // This function was created to make the code cleaner 
  // and allow creating a Body object for balls easier.
  // It takes in pos and vel because balls can start in different positions and have varying velocities.
  const createBall = (pos: Vec) => (vel: Vec) => <Body>{
    id: "ball",
    viewType: "ball",
    pos: pos,
    vel: vel,
    height: Constants.BallSize,
    width: Constants.BallSize,
    createTime: Constants.StartTime
  }

  // Returns a random number between [-1, 1]
  // This function is used to create a random number of the velocity of the ball
  // so the ball can go in a random direction at the start of the game.
  const getRandomNum = (seed: number) => {
    const r = new RNG(seed).nextFloat();    // returns a number between [0, 1]
    return r >= 0.5 ? r : -r;                 // negating the random number if r>=0.5 means the ball can go left or right.
  }

  // An initialState object was created for the scan() operator.
  // An initial value for scan is needed for it to be 'accumulated' with new states.
  const initialState: State = {
    time: Constants.StartTime,
    rightPaddle: createPaddle("right")(new Vec(570, 280)),
    leftPaddle: createPaddle("left")(new Vec(30, 280)),
    ball: createBall(new Vec(Constants.CanvasSize / 2, Constants.CanvasSize / 2))(new Vec(2, getRandomNum(Constants.StartTime))),
    leftPlayerPoints: 0,
    rightPlayerPoints: 0,
    gameOver: false
  }

  // Creates new ball if ball touches any surface, and updates points in returned state if required.
  const handleBounces = (s: State) => {
    const ballCollideTop = (b: Body) => Math.round(b.pos.y) === 0;
    const ballCollideBottom = (b: Body) => Math.round((b.pos.y + Constants.BallSize)) === Constants.CanvasSize;
    const ballCollideLeftWall = (b: Body) => b.pos.x === 0;
    const ballCollideRightWall = (b: Body) => (b.pos.x + Constants.PaddleWidth) === Constants.CanvasSize;
    const ballCollideLeftPaddle = (ball: Body, pad: Body) => (ball.pos.x === pad.pos.x + Constants.PaddleWidth) &&
      (ball.pos.y >= pad.pos.y + (Constants.BallSize / 2)) &&
      (ball.pos.y <= pad.pos.y + Constants.PaddleHeight + (Constants.BallSize / 2));
    const ballCollideRightPaddle = (ball: Body, pad: Body) => (ball.pos.x + Constants.BallSize === pad.pos.x) &&
      (ball.pos.y >= pad.pos.y - (Constants.BallSize / 2)) &&
      (s.ball.pos.y <= (pad.pos.y + Constants.PaddleHeight) - (Constants.BallSize / 2));

    // A new ball is created if it touches a wall/paddle because the given ball in the state shouldn't be manipulated.
    // If the ball bounced off something vertcal, reverse the sign of the x-velocity,
    // else if the ball bounced off something horizontal, reverse the sign of the y-velocity.
    const newBall = ballCollideBottom(s.ball) || ballCollideTop(s.ball)
      ? createBall(s.ball.pos)(new Vec(s.ball.vel.x, -s.ball.vel.y))
      : ballCollideRightPaddle(s.ball, s.rightPaddle) || ballCollideLeftPaddle(s.ball, s.leftPaddle)
        ? createBall(s.ball.pos)(new Vec(-s.ball.vel.x, s.ball.vel.y))
        : ballCollideLeftWall(s.ball) || ballCollideRightWall(s.ball)
          ? createBall(new Vec(Constants.CanvasSize / 2, s.rightPaddle.pos.y))
            (getRandomNum(s.time) >= 0.5 ? new Vec(-2, getRandomNum(s.time)) : new Vec(2, getRandomNum(s.time)))
          : s.ball;   // no bounces, so just return the ball from the given state

    // Changes the player's points if the ball hits a wall
    const leftPts = ballCollideRightWall(s.ball) ? s.leftPlayerPoints + 1 : s.leftPlayerPoints;
    const rightPts = ballCollideLeftWall(s.ball) ? s.rightPlayerPoints + 1 : s.rightPlayerPoints
    return <State>{
      ...s,
      ball: newBall,
      leftPlayerPoints: leftPts,
      rightPlayerPoints: rightPts,
      gameOver: leftPts === 7 || rightPts === 7
    }
  }

  // Adds the ball's velocity to its current position to move ball
  const moveBall = (b: Body) => <Body>{
    ...b,
    pos: b.pos.add(b.vel),
  }

  // The left paddle follows the y-position of ball,
  // minus (Constants.PaddleHeight/2) to make the ball land in the middle of the paddle.
  const moveLeftPaddle = (ball: Body, paddle: Body) => <Body>{
    ...ball,
    pos: new Vec(paddle.pos.x, ball.pos.y - (Constants.PaddleHeight / 2))
  }

  // Responsible for handling ball bounces, moving the ball, moving the left paddle, and updating the time.
  const tick = (s: State, elapsed: number) => {
    return handleBounces({
      ...s,
      leftPaddle: moveLeftPaddle(s.ball, s.leftPaddle),
      ball: moveBall(s.ball),
      time: elapsed
    });
  }

  // Returns a new object representing the transformed state by either:
  //    - moving the right-sided paddle according to length held in the Slide object, or
  //    - calling the tick function
  const reduceState = (s: State, e: Slide | Tick) => {
    return e instanceof Slide ? {
      ...s,
      rightPaddle: {
        ...s.rightPaddle,
        pos: new Vec(s.rightPaddle.pos.x, s.rightPaddle.pos.y + e.length)
      }
    } : tick(s, e.elapsed);
  }

  const subscription = interval(5).pipe(
    map(elapsed => new Tick(elapsed)),
    merge(startUpSlide, startDownSlide, stopUpSlide, stopDownSlide),
    scan(reduceState, initialState)
  ).subscribe(updateView);    // side effect inside subscribe()

  // This function is impure because it changes elements on the svg canvas
  function updateView(s: State) {
    const svg = document.getElementById("canvas");
    const rightPad = document.getElementById("rightPaddle");
    const leftPad = document.getElementById("leftPaddle");
    const ball = document.getElementById("ball");
    const leftPoints = document.getElementById("leftPlayerPoints");
    const rightPoints = document.getElementById("rightPlayerPoints");
    // The attr function was copied from: https://tgdwyer.github.io/asteroids/ 
    const attr = (e: Element, o: Object) => {
      for (const k in o) {
        e.setAttribute(k, String(o[k]))
      }
    };
    attr(rightPad, { transform: `translate(${s.rightPaddle.pos.x}, ${s.rightPaddle.pos.y})` });
    attr(leftPad, { transform: `translate(${s.leftPaddle.pos.x}, ${s.leftPaddle.pos.y})` });
    attr(ball, { transform: `translate(${s.ball.pos.x}, ${s.ball.pos.y})` });

    // Points on canvas are updated here because this is the only function that changes the environment
    if (leftPoints.textContent !== s.leftPlayerPoints.toString()) {
      leftPoints.textContent = s.leftPlayerPoints.toString();
    }
    if (rightPoints.textContent !== s.rightPlayerPoints.toString()) {
      rightPoints.textContent = s.rightPlayerPoints.toString();
    }

    if (s.gameOver) {
      subscription.unsubscribe();
      const v = document.createElementNS(svg.namespaceURI, "text")!;
      attr(v, { x: Constants.CanvasSize / 6, y: Constants.CanvasSize / 2, class: "gameover" });
      v.textContent = "Game Over";
      svg.appendChild(v);
      const w = document.createElementNS(svg.namespaceURI, "text")!;
      attr(w, { x: Constants.CanvasSize / 6, y: Constants.CanvasSize / 2 + 100, class: "winner" });
      w.textContent = s.leftPlayerPoints === 7 ? "Computer Won!" : "You Won!";
      svg.appendChild(w);
    }
  }

}

// the following simply runs your pong function on window load.  Make sure to leave it in place.
if (typeof window != 'undefined') {
  window.onload = () => {
    pong();
  }
}

/**
   * This class is used for the elements' x- and y-position and x- and y-velocity.
   * This class was copied from: https://tgdwyer.github.io/asteroids/
   */
class Vec {
  constructor(public readonly x: number = 0, public readonly y: number = 0) { }
  add = (b: Vec) => new Vec(this.x + b.x, this.y + b.y);
  sub = (b: Vec) => this.add(b.scale(-1));
  len = () => Math.sqrt(this.x * this.x + this.y * this.y);
  scale = (s: number) => new Vec(this.x * s, this.y * s);
  ortho = () => new Vec(this.y, -this.x);
  static Zero = new Vec();
}

/** 
 * A simple, seedable, pseudo-random number generator class.
 * This class was added because a pure number generator is needed.
 * This was copied from: observableexample.ts (Week 4 Moodle)
*/
class RNG {
  // LCG using GCC's constants
  m = 0x80000000// 2**31
  a = 1103515245
  c = 12345
  state: number
  constructor(seed: number) {
    this.state = seed ? seed : Math.floor(Math.random() * (this.m - 1));
  }
  nextInt() {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state;
  }
  nextFloat() {
    // returns in range [0,1]
    return this.nextInt() / (this.m - 1);
  }
}