/* ============================================================
   MULTI-STEP FORM LOGIC
   ============================================================ */
(() => {
  'use strict';

  // Elements
  const hero          = document.getElementById('hero');
  const formWrapper   = document.getElementById('formWrapper');
  const thankyou      = document.getElementById('thankyou');
  const form          = document.getElementById('questionnaireForm');
  const startBtn      = document.getElementById('startBtn');
  const prevBtn       = document.getElementById('prevBtn');
  const nextBtn       = document.getElementById('nextBtn');
  const submitBtn     = document.getElementById('submitBtn');
  const progressFill  = document.getElementById('progressFill');
  const progressLabel = document.getElementById('progressLabel');
  const dots          = document.querySelectorAll('.progress__dot');
  const steps         = document.querySelectorAll('.step');

  const TOTAL_STEPS = steps.length;
  let currentStep   = 0;

  // Step labels
  const stepLabels = [
    'Business Overview',
    'Target Audience',
    'Branding & Design',
    'Content & Structure',
    'Features & Functionality',
    'Marketing & SEO',
    'Budget & Timeline',
  ];

  // Set the redirect URL for Formsubmit (redirects back to same page with ?thanks param)
  const redirectInput = document.getElementById('redirectUrl');
  if (redirectInput) {
    redirectInput.value = window.location.href.split('?')[0] + '?thanks=1';
  }

  // Check if we came back from a successful submission
  if (window.location.search.includes('thanks=1')) {
    showThankYou();
  }

  // ---- START BUTTON ----
  startBtn.addEventListener('click', () => {
    hero.style.opacity = '0';
    hero.style.transform = 'translateY(-30px)';
    hero.style.transition = 'all 0.5s cubic-bezier(0.4,0,0.2,1)';
    setTimeout(() => {
      hero.style.display = 'none';
      formWrapper.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 400);
  });

  // ---- NAVIGATION ----
  nextBtn.addEventListener('click', () => {
    if (!validateStep(currentStep)) return;
    goToStep(currentStep + 1);
  });

  prevBtn.addEventListener('click', () => {
    goToStep(currentStep - 1);
  });

  // Allow clicking progress dots
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const target = parseInt(dot.dataset.step, 10);
      // Only allow going back or to a completed step
      if (target < currentStep) {
        goToStep(target);
      } else if (target === currentStep + 1 && validateStep(currentStep)) {
        goToStep(target);
      }
    });
  });

  // ---- KEYBOARD NAV ----
  document.addEventListener('keydown', (e) => {
    if (!formWrapper.classList.contains('active')) return;
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      if (currentStep < TOTAL_STEPS - 1) {
        nextBtn.click();
      } else {
        submitBtn.click();
      }
    }
  });

  // ---- GO TO STEP ----
  function goToStep(index) {
    if (index < 0 || index >= TOTAL_STEPS) return;

    // Hide current step
    steps[currentStep].classList.remove('active');

    // Show target step
    currentStep = index;
    steps[currentStep].classList.remove('active');
    // Force reflow for animation
    void steps[currentStep].offsetWidth;
    steps[currentStep].classList.add('active');

    updateProgress();
    updateNav();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---- UPDATE PROGRESS ----
  function updateProgress() {
    const pct = ((currentStep + 1) / TOTAL_STEPS) * 100;
    progressFill.style.width = pct + '%';

    dots.forEach((dot, i) => {
      dot.classList.remove('active', 'completed');
      if (i === currentStep)  dot.classList.add('active');
      else if (i < currentStep) dot.classList.add('completed');
    });

    progressLabel.textContent = `Step ${currentStep + 1} of ${TOTAL_STEPS} — ${stepLabels[currentStep]}`;
  }

  // ---- UPDATE NAV BUTTONS ----
  function updateNav() {
    prevBtn.disabled = (currentStep === 0);

    if (currentStep === TOTAL_STEPS - 1) {
      nextBtn.style.display = 'none';
      submitBtn.style.display = 'inline-flex';
    } else {
      nextBtn.style.display = 'inline-flex';
      submitBtn.style.display = 'none';
    }
  }

  // ---- VALIDATION ----
  function validateStep(stepIndex) {
    const step = steps[stepIndex];
    const required = step.querySelectorAll('[required]');
    let valid = true;

    // Clear previous errors
    step.querySelectorAll('.field__error-msg').forEach(el => el.remove());
    step.querySelectorAll('.error').forEach(el => el.classList.remove('error'));

    required.forEach(input => {
      if (input.type === 'radio') {
        // Check if at least one radio in the group is selected
        const group = step.querySelectorAll(`input[name="${input.name}"]`);
        const checked = Array.from(group).some(r => r.checked);
        if (!checked) {
          valid = false;
          // Find parent field and show error
          const field = input.closest('.field');
          if (field && !field.querySelector('.field__error-msg')) {
            const msg = document.createElement('p');
            msg.className = 'field__error-msg';
            msg.textContent = 'Please select an option.';
            field.appendChild(msg);
          }
        }
      } else if (input.type === 'checkbox') {
        // Checkbox groups: at least one checked
        const group = step.querySelectorAll(`input[name="${input.name}"]`);
        const checked = Array.from(group).some(c => c.checked);
        if (!checked) {
          valid = false;
          const field = input.closest('.field');
          if (field && !field.querySelector('.field__error-msg')) {
            const msg = document.createElement('p');
            msg.className = 'field__error-msg';
            msg.textContent = 'Please select at least one option.';
            field.appendChild(msg);
          }
        }
      } else {
        if (!input.value.trim()) {
          valid = false;
          input.classList.add('error');
          const field = input.closest('.field');
          if (field && !field.querySelector('.field__error-msg')) {
            const msg = document.createElement('p');
            msg.className = 'field__error-msg';
            msg.textContent = 'This field is required.';
            field.appendChild(msg);
          }
        }
      }
    });

    if (!valid) {
      step.classList.add('shake');
      setTimeout(() => step.classList.remove('shake'), 500);

      // Scroll to first error
      const firstError = step.querySelector('.error, .field__error-msg');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    return valid;
  }

  // Remove error styling on input
  form.addEventListener('input', (e) => {
    if (e.target.classList.contains('error')) {
      e.target.classList.remove('error');
    }
    // Remove error message from parent field
    const field = e.target.closest('.field');
    if (field) {
      const msg = field.querySelector('.field__error-msg');
      if (msg) msg.remove();
    }
  });

  form.addEventListener('change', (e) => {
    const field = e.target.closest('.field');
    if (field) {
      const msg = field.querySelector('.field__error-msg');
      if (msg) msg.remove();
    }
  });

  // ---- FORM SUBMIT ----
  form.addEventListener('submit', (e) => {
    if (!validateStep(currentStep)) {
      e.preventDefault();
      return;
    }
    // Form submits normally to Formsubmit
  });

  // ---- THANK YOU ----
  function showThankYou() {
    hero.style.display = 'none';
    formWrapper.style.display = 'none';
    thankyou.classList.add('active');
  }

  // ---- INITIAL STATE ----
  updateProgress();
  updateNav();
})();
