const mapValues = function (range1, range2, value) {
  // Check if the ranges are in [min, max] or [max, min] order
  const [min1, max1] = range1[0] < range1[1] ? range1 : [range1[1], range1[0]];
  const [min2, max2] = range2[0] < range2[1] ? range2 : [range2[1], range2[0]];

  // Calculate the relative position of the value within range1
  let relativePosition;

  if (range1[0] < range1[1]) {
    // If range1 is in ascending order, use this formula
    relativePosition = (value - min1) / (max1 - min1);
  } else {
    // If range1 is in descending order, adjust the formula
    relativePosition = (max1 - value) / (max1 - min1);
  }

  // Map this relative position to the second range, considering its order
  let mappedValue;

  if (range2[0] < range2[1]) {
    // If range2 is in ascending order
    mappedValue = relativePosition * (max2 - min2) + min2;
  } else {
    // If range2 is in descending order
    mappedValue = (1 - relativePosition) * (max2 - min2) + min2;
  }

  return mappedValue;
};

const randomIntFromInterval = function (min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

const getClickAngle = function (id, event) {
  // Get the circle element and its center coordinates
  const circle = document.getElementById(id);
  const circleCenterX = circle.cx.baseVal.value;
  const circleCenterY = circle.cy.baseVal.value;

  // Get the coordinates of the click relative to the SVG
  const clickX =
    event.clientX - circle.ownerSVGElement.getBoundingClientRect().left;
  const clickY =
    event.clientY - circle.ownerSVGElement.getBoundingClientRect().top;

  // Calculate the difference in position
  const dx = clickX - circleCenterX;
  const dy = clickY - circleCenterY;

  // Calculate the angle in radians using atan2 (relative to the center of the circle)
  const angleRadians = Math.atan2(dy, dx);

  // Convert the angle to degrees
  let angleDegrees = angleRadians * (180 / Math.PI);

  // Adjust angle so that 0 degrees is at the top of the circle
  angleDegrees = (angleDegrees + 90) % 360;

  if (angleDegrees < 0) {
    angleDegrees += 360;
  }

  // Display the result
  return Math.round(angleDegrees);
};

function withinCircle(a, b, x, y, r) {
  // Calculate the squared distance between the center of the circle (x, y) and the point (a, b)
  const dist_points = (a - x) * (a - x) + (b - y) * (b - y);
  // Square the radius for comparison
  r *= r;
  // Check if the squared distance between points is less than the squared radius
  if (dist_points < r) {
    return true; // Point is inside the circle
  }
  return false; // Point is outside the circle or on the circle
}

function getRandomInRange(min, max, excludeMin, excludeMax) {
  // Ensure that the exclusion range is within the bounds
  if (excludeMin < min) excludeMin = min;
  if (excludeMax > max) excludeMax = max;

  // Generate a random number within the full range, excluding the subrange
  let random;
  do {
    random = Math.floor(Math.random() * (max - min + 1)) + min;
  } while (random >= excludeMin && random <= excludeMax); // Retry if in exclusion range

  return random;
}

function scaleAndCenterSVG(el) {
  console.log("starting scale");
  const parentEl = el.parentElement;
  const parentW = parentEl.offsetWidth;
  const parentH = parentEl.offsetHeight;
  console.log("parentEl", parentEl, "h", parentH, "w", parentW);

  // Get the original SVG size from the SVG element's attributes
  const myW = el.offsetWidth || 300 + 5;
  const myH = el.offsetHeight || 300 + 5;
  // console.log("MyEl", el, "h", myH, "w", myW);

  // Calculate the scaling factor to fit the SVG inside the page (preserving aspect ratio)
  const scaleFactor = Math.min(parentW / myW, parentH / myH);

  // Calculate the scaled width and height of the SVG
  const scaledWidth = myW * scaleFactor;
  const scaledHeight = myH * scaleFactor;

  // Set the viewBox to define the coordinate system of the SVG, based on its original size
  el.setAttribute("viewBox", `0 0 ${myW} ${myH}`);

  // Set the SVG's new width and height based on scaling
  el.setAttribute("width", scaledWidth);
  el.setAttribute("height", scaledHeight);

  // Clear any previous inline positioning
  el.style.position = "relative";

  const centerX = (parentW - scaledWidth) / 2;
  const centerY = (parentH - scaledHeight) / 2;

  el.style.left = `${centerX}px`;
  el.style.top = `${centerY}px`;
  el.style.transform = `scale(${scaleFactor})`;
  // svgElement.style.transform = `translate(${centerX}px, ${centerY}px) scale(${scaleFactor})`;
  parentEl.appendChild(el);
}

function scaleElementTo(el, tgt, layout) {
  const tgtEl = tgt ? tgt : el.parentElement;

  const parentW = layout ? layout.width : tgtEl.offsetWidth;
  const parentH = layout ? layout.height : tgtEl.offsetHeight;

  // Get the original SVG size from the SVG element's attributes
  const myW = el.offsetWidth || 300;
  const myH = el.offsetHeight || 300;
  
  // Calculate the scaling factor to fit the SVG inside the page
  // Use the minimum of width/height ratios to maintain aspect ratio
  // This ensures square components remain square
  const scaleX = parentW / myW;
  const scaleY = parentH / myH;
  const scaleFactor = Math.min(scaleX, scaleY);

  // Calculate the scaled width and height of the SVG
  // Use the same scale factor for both dimensions to maintain aspect ratio
  const scaledWidth = myW * scaleFactor;
  const scaledHeight = myH * scaleFactor;

  // Set the viewBox to define the coordinate system of the SVG, based on its original size
  el.setAttribute("viewBox", `0 0 ${myW} ${myH}`);

  // Set the SVG's new width and height based on scaling
  el.setAttribute("width", scaledWidth);
  el.setAttribute("height", scaledHeight);

  // Center the element in the container
  const centerX = (parentW - scaledWidth) / 2;
  const centerY = (parentH - scaledHeight) / 2;

  el.style.left = `${centerX}px`;
  el.style.top = `${centerY}px`;
  
  // Apply the same scale factor to both dimensions to maintain aspect ratio
  el.style.transform = `translate(-${(myW - scaledWidth) / 2}px, -${
    (myH - scaledHeight) / 2
  }px) scale(${scaleFactor})`;
  
  tgtEl.appendChild(el);
}

function scaleToLayout(el, layout) {

  const myBB = el.getBoundingClientRect().toJSON();
  const scaleLayout = {};
  const translateLayout = {};
  Object.keys(myBB).forEach((k) => {
    scaleLayout[k] = myBB[k] / layout[k];
    translateLayout[k] = layout[k] - myBB[k];
  });

}

const scaleAndCenterInParent = scaleAndCenterSVG;

export {
  mapValues,
  randomIntFromInterval,
  getClickAngle,
  withinCircle,
  getRandomInRange,
  scaleAndCenterSVG,
  scaleAndCenterInParent,
  scaleElementTo,
  scaleToLayout,
};
