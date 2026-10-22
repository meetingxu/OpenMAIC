import { describe, expect, it } from 'vitest';
import { findInteractiveContentFailure as check } from '../src/interactive-script-validator.js';

const doc = (script: string, body = '') =>
  `<html><body>${body}<script>${script}</script></body></html>`;
describe('interactive reference validation', () => {
  it('rejects the reported missing playTone helper, even in a click callback', () => {
    expect(
      check(
        doc(`document.addEventListener('DOMContentLoaded',()=>{
      document.getElementById('timeline').addEventListener('click',()=>playTone(420));
      function tone(freq,dur) { console.log(freq,dur); }
    });`),
      ),
    ).toMatchObject({ kind: 'script-reference', message: expect.stringContaining('playTone') });
  });
  it('rejects missing state referenced inside a template', () => {
    expect(
      check(doc('const pointer=1;const state={selected:`${pointer===target}`};'))?.message,
    ).toContain('target');
  });
  it('rejects inline handlers whose functions are private to DOMContentLoaded', () => {
    expect(
      check(
        doc(
          `document.addEventListener('DOMContentLoaded',()=>{ function nextLevel(){} });`,
          '<button onclick="nextLevel()">Next</button>',
        ),
      )?.message,
    ).toContain('not available to the inline handler');
  });
  it('also checks inline handlers constructed in HTML templates', () => {
    expect(
      check(
        doc(
          'document.addEventListener("DOMContentLoaded",()=>{ function chooseAction(i){}; document.body.innerHTML=`<button onclick="chooseAction(${1})">Go</button>`; });',
        ),
      )?.message,
    ).toContain('chooseAction');
  });
  it.each([
    'function chooseAction(){}',
    'window.chooseAction=()=>{};',
    'document.addEventListener("DOMContentLoaded",()=>{function chooseAction(){};Object.assign(window,{chooseAction});});',
    'document.addEventListener("DOMContentLoaded",()=>{window["chooseAction"]=()=>{};});',
    'const chooseAction=()=>{};',
  ])('accepts globally available inline handlers: %s', (script) => {
    expect(check(doc(script, '<button onclick="chooseAction()">Go</button>'))).toBeNull();
  });
  it('accepts handlers bound within the lexical scope, parameters and destructuring', () => {
    expect(
      check(
        doc(`document.addEventListener('DOMContentLoaded',()=>{
      const chooseAction=({value})=>console.log(value);
      document.body.addEventListener('click',event=>chooseAction({value:event.type}));
    });`),
      ),
    ).toBeNull();
  });
  it('combines classic script globals without exposing module-private functions', () => {
    expect(check('<script>const value=1;</script><script>console.log(value);</script>')).toBeNull();
    expect(
      check('<script type="module">function go(){}</script><button onclick="go()">Go</button>')
        ?.message,
    ).toContain('go');
  });
  it('allows standard APIs, element globals and typeof feature checks', () => {
    expect(
      check(
        doc(
          `if(typeof optionalLibrary!=='undefined')console.log('available'); Math.max(1,2); requestAnimationFrame(()=>{}); console.log(myButton);`,
          '<button id="myButton" onclick="return false">Go</button>',
        ),
      ),
    ).toBeNull();
  });
  it('ignores comments, strings, JSON, and inert template markup', () => {
    expect(
      check(
        doc(
          '// playTone();\nconst text="missingFunction()";',
          '<template><button onclick="missing()">Go</button></template><script type="application/json">{"callback":"missing()"}</script>',
        ),
      ),
    ).toBeNull();
  });
  it('allows only explicitly imported library globals, without exempting missing local helpers', () => {
    expect(
      check(
        '<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>' +
          doc('d3.select("body");'),
      ),
    ).toBeNull();
    expect(
      check(
        '<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>' +
          doc('d3.select("body");playTone(420);'),
      )?.message,
    ).toContain('playTone');
    expect(check(doc('d3.select("body");'))?.message).toContain('d3');
  });
  it('does not execute generated code or event handlers while validating', () => {
    expect(check(doc('while(true){}', '<button onclick="while(true){}">Go</button>'))).toBeNull();
  });
});
