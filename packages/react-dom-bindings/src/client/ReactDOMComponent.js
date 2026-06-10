import { setValueForStyle } from "./CSSPropertyOperations";
import { setValueForProperty } from "./DOMPropertyOperations";
import { setTextContent } from "./setTextContent";

export function setInitialProperties(domElement, tag, props) {
  setInitialDOMProperties(tag, domElement, props);
}

function setInitialDOMProperties(tag, domElement, nextProps) {
  for (let propKey in nextProps) {
    if (nextProps.hasOwnProperty(propKey)) {
      const nextProp = nextProps[propKey];
      if (propKey === "style") {
        setValueForStyle(domElement, nextProp);
      } else if (propKey === "children") {
        if (typeof nextProp === "string" || typeof nextProp === "number") {
          setTextContent(domElement, `${nextProp}`);
        }
      } else {
        setValueForProperty(domElement, propKey, nextProp);
      }
    }
  }
}
