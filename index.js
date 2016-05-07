var Cylon = require("cylon");
var RollingSpider = require("rolling-spider");
var rollingSpider = new RollingSpider('df438204cf66483b9317d0ddef797d55');

var handsCount = 0;
var rightHand = null;
var leftHand = null;

var flying = false;
var ready = false;

var busy = {
  flip: false,
  vertical: false,
  turning: false,
  move: false
};


var callibrateDrone = function() {
  rollingSpider.flatTrim();
  rollingSpider.startPing();
  rollingSpider.flatTrim();
};

var takeOff = function() {
  if (!flying) {
    console.log("Taking off...");
    rollingSpider.flatTrim();
    rollingSpider.takeOff(function() {
      flying = true;
      console.log("Flying...");
    });
    rollingSpider.flatTrim();
  }
};

var land = function() {
  if (flying) {
    console.log("Landing...");
    rollingSpider.land(function() {
      flying = false;
      console.log("Landed");
    });
  }
};

var controlDrone = function(action, busyProperty, speed, steps) {
    console.log("Control: ", action);
  if (flying && !busy[busyProperty]) {
    console.log("Control: ", action);
    busy[busyProperty] = true;
    rollingSpider[action]({
      speed: speed || 10,
      steps: steps || 1
    }, function() {
      busy[busyProperty] = false;
    });
  }
};

var flipDrone = function() {
  if (flying && !busy.flip) {
    console.log("Control: frontFlip");
    busy.flip = true;
    rollingSpider.frontFlip(function() {
      busy.flip = false;
    });
  }
};

var moveDroneUp = function() {
  controlDrone("up", "vertical", 30, 2);
};

var moveDroneDown = function() {
  controlDrone("down", "vertical", 30, 2);
};

var turnDroneRight = function() {
  controlDrone("turnRight", "turning", 50, 3);
};

var turnDroneLeft = function() {
  controlDrone("turnLeft", "turning", 50, 3);
};

var moveDroneLeft = function() {
  controlDrone("left", "move", 50);
};

var moveDroneRight = function() {
  controlDrone("right", "move", 50);
};

var moveDroneForward = function() {
  controlDrone("forward", "move", 50);
};

var moveDroneBackward = function() {
  controlDrone("backward", "move", 50);
};

console.log("Connecting to drone...");
rollingSpider.connect(function (error) {
  if (error) {
    console.log("Failed to connect to drone", error);
    process.exit(1);
  }
  rollingSpider.setup(function () {
    console.log("start");

    // Callibrate and connect
    callibrateDrone();

    console.log("Connected to drone");
    ready = true;
  });
});

var dot = function() {
  console.log(".");
  setTimeout(dot, 1000);
};
dot();

var loop = function() {
  if (!busy.flip) {
    if (rightHand) {
      var rightX = rightHand.direction[0];
      var rightY = rightHand.direction[1];
      if (0.40 < rightY && rightY < 0.90) {
        moveDroneUp();
      } else if (-0.30 > rightY && rightY > -0.90) {
        moveDroneDown();
      }

      if (rightX < -0.60) {
        turnDroneLeft();
      } else if (rightX > 0.3) {
        turnDroneRight();
      }
      
      if (leftHand) {
        var leftAngle = leftHand.palmNormal[0];
        var leftY = leftHand.direction[1];
        if (leftAngle < -0.6) {
          moveDroneRight();
        } else if (leftAngle > 0.6) {
          moveDroneLeft();
        }

        if (0.30 < leftY && leftY < 0.90) {
          moveDroneForward();
        } else if (-0.30 > leftY && leftY > -0.90) {
          moveDroneBackward();
        }
      }
    }
  }
  setTimeout(loop, 10);
};
loop();

console.log("Starting leapmotion...");
Cylon.robot({
  connections: {
    leapmotion: { adaptor: "leapmotion" }
  },

  devices: {
    leapmotion: { driver: "leapmotion" }
  },

  work: function(my) {
    my.leapmotion.on("gesture", function(gesture) {
      if (ready && flying && !busy.flip) {
        switch (gesture.type){
          case "circle":
              console.log("Circle Gesture");
              flipDrone();
        }
      }
    });

    my.leapmotion.on("frame", function(frame) {
      if (frame.hands.length > 0) {
        rightHand = frame.hands[0];
        if (frame.hands.length > 1) {
          leftHand = frame.hands[1];
        } else {
          leftHand = null;
        }
        
        if (ready && !flying) {
          if (handsCount == 0 && frame.hands.length > 0) {
            handsCount = 1;
            takeOff();
          }
        }
        return;
      } else {
        leftHand = null;
        rightHand = null;
      }

      if (flying) {
        if (handsCount > 0 && frame.hands.length == 0) {
          handsCount = 0;
          land();
        }
      }
    });
  }
}).start();