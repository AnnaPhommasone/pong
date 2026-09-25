//import { interval, fromEvent, from, zip} from 'rxjs'
//import { map, scan, filter, merge, flatMap, take, concat, takeUntil } from 'rxjs/operators'
function pong() {
    // Inside this function you will use the classes and functions 
    // from rx.js
    // to add visuals to the svg element in pong.html, animate them, and make them interactive.
    // Study and complete the tasks in observable exampels first to get ideas.
    // Course Notes showing Asteroids in FRP: https://tgdwyer.github.io/asteroids/ 
    // You will be marked on your functional programming style
    // as well as the functionality that you implement.
    // Document your code!  
    var svg = document.getElementById("canvas");
    var rect = document.createElementNS(svg.namespaceURI, 'rect');
    rect.setAttribute('x', '100');
    rect.setAttribute('y', '70');
    rect.setAttribute('width', '120');
    rect.setAttribute('height', '80');
    rect.setAttribute('fill', '#95B3D7');
    svg.appendChild(rect);
}
// the following simply runs your pong function on window load.  Make sure to leave it in place.
if (typeof window != 'undefined')
    window.onload = function () {
        pong();
    };
