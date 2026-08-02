/**
 * Implement Gatsby's Browser APIs in this file.
 *
 * See: https://www.gatsbyjs.org/docs/browser-apis/
 */

// Console easter egg. Runs once on initial client render.
// The console calls here are the whole point, so no-console is off for them.
/* eslint-disable no-console */
export const onClientEntry = () => {
  console.log('%cyou opened the console', 'font-size:15px;color:#64ffda;font-weight:600');
  console.log('type  whoami()');

  window.whoami = () => {
    console.log(
      'Colton Gray — agent engineer, New Orleans.\n' +
        'I build AI agents that run in production and pay for themselves.\n' +
        'colton@graycoding.dev\n\n' +
        'Also: I sank a sailboat once. Separately, the Coast Guard had to come get me.\n' +
        'Ask me about either one.',
    );
  };
};
