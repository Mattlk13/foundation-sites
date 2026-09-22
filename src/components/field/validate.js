// Form validation: the browser already knows what is wrong with a control and
// has a sentence for it in the reader's own language. This puts that sentence
// where the field already shows an error, marks the control the way the field
// already reads, and stops the submit.
//
// It runs on submit, never before, so nothing is red while a person is still
// typing their first character; :user-invalid covers the field they have
// finished with, and this covers the one they never touched.
//
// A form that loads this should carry novalidate. Without it the browser's own
// bubble opens on the first invalid control and the submit event is never
// fired at all, so this would never run. The docs say so.
//
// Delegated on document, so a form added after load works too, and safe on a
// page with no form at all. No rules of its own, no async checks, and no
// message catalogue: everything it says comes from the platform.

// The slots this module filled. An author's own message is never overwritten,
// but the browser's own wording is rewritten as the reason changes: "fill in
// this field" becomes "include an @" once something has been typed.
const written = new WeakSet();

function mark(control) {
	control.setAttribute('aria-invalid', 'true');
	const error = control.closest('.field')?.querySelector(':scope > [data-error]');
	if (!error) return;
	if (written.has(error) || !error.textContent.trim()) {
		error.textContent = control.validationMessage;
		written.add(error);
	}
}

document.addEventListener('submit', (event) => {
	const form = event.target;
	if (!form?.matches?.('form')) return;
	// validity rather than checkValidity(), which fires an invalid event of
	// its own on every control it touches; the only event this module should
	// be dispatching is its own.
	const controls = [...form.elements].filter((el) => el.willValidate && !el.validity.valid && el.closest('.field'));
	if (!controls.length) return;
	event.preventDefault();
	for (const control of controls) mark(control);
	// The first one, because that is where the reader has to start, and
	// focusing it is also what scrolls it into view.
	controls[0].focus();
	form.dispatchEvent(new CustomEvent('yeti:invalid', { bubbles: true, composed: true, detail: { controls } }));
});

// input for what is typed, change for what is picked. The mark goes the moment
// the control is valid again, rather than waiting for the next submit, because
// a red box that stays red after it has been fixed teaches a reader to ignore
// the colour.
const clear = (event) => {
	const control = event.target;
	if (!control?.closest?.('.field') || !control.willValidate) return;
	if (control.validity.valid) control.removeAttribute('aria-invalid');
};
document.addEventListener('input', clear);
document.addEventListener('change', clear);
