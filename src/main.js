// Entry point. The page itself is in app.js; this file only makes sure a failure to start is said on the
// page instead of leaving it blank (a content file missing, or broken JSON after an edit).

try {
  await import('./app.js');
} catch (error) {
  console.error(error);
  const notice = document.createElement('div');
  notice.className = 'load-error';
  notice.setAttribute('role', 'alert');
  notice.innerHTML = '<b>This page could not start.</b><p></p>';
  notice.querySelector('p').textContent = `${error.message}. Run "npm run check" to find the problem in content/.`;
  document.body.appendChild(notice);
}
