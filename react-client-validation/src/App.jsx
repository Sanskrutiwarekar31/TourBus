import React, { useState } from 'react';
import './App.css';

const buses = [
  { value: 'BUS101', name: 'GreenLine Travels' },
  { value: 'BUS102', name: 'Coastal Express' },
  { value: 'BUS111', name: 'Konkan Cruiser' },
  { value: 'BUS114', name: 'Konkan Express' },
];

const seats = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];

const initialValues = {
  fullName: '',
  email: '',
  mobile: '',
  age: '',
  bus: '',
  journeyDate: '',
  seat: '',
  acceptedTerms: false,
};

const fieldValidators = {
  fullName: (value) =>
    value.trim().length >= 3 && !/\d/.test(value)
      ? ''
      : 'Please enter a valid passenger name.',
  email: (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
      ? ''
      : 'Please enter a valid email address.',
  mobile: (value) =>
    /^[6-9]\d{9}$/.test(value) ? '' : 'Enter a valid 10-digit mobile number.',
  age: (value) => {
    if (!/^\d+$/.test(value)) return 'Age must be between 5 and 100.';
    const age = Number(value);
    return age >= 5 && age <= 100 ? '' : 'Age must be between 5 and 100.';
  },
  bus: (value) => (value ? '' : 'Please select a bus.'),
  journeyDate: (value) =>
    value && value >= getToday()
      ? ''
      : 'Please select a valid journey date.',
  seat: (value) => (value ? '' : 'Please select a seat.'),
  acceptedTerms: (value) =>
    value ? '' : 'Please accept the terms and conditions.',
};

function getToday() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function validateForm(values) {
  return Object.fromEntries(
    Object.entries(fieldValidators)
      .map(([field, validate]) => [field, validate(values[field])])
      .filter(([, error]) => error),
  );
}

function Field({ id, label, error, className = '', children }) {
  const errorId = `${id}-error`;

  return (
    <div className={`field ${className}`}>
      <label htmlFor={id}>{label}</label>
      {children({ errorId })}
      {error && (
        <p className="field-error" id={errorId} role="alert">
          <span aria-hidden="true">!</span>
          {error}
        </p>
      )}
    </div>
  );
}

function App() {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isValidated, setIsValidated] = useState(false);

  function updateField(field, value) {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);
    setIsValidated(false);

    if (hasSubmitted) {
      const error = fieldValidators[field](value);
      setErrors((currentErrors) => {
        const nextErrors = { ...currentErrors };
        if (error) nextErrors[field] = error;
        else delete nextErrors[field];
        return nextErrors;
      });
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateForm(values);
    setErrors(nextErrors);
    setHasSubmitted(true);
    setIsValidated(Object.keys(nextErrors).length === 0);
  }

  function handleReset() {
    setValues({ ...initialValues });
    setErrors({});
    setHasSubmitted(false);
    setIsValidated(false);
  }

  function inputProps(field) {
    return {
      id: field,
      name: field,
      value: values[field],
      'aria-invalid': Boolean(errors[field]),
      'aria-describedby': errors[field] ? `${field}-error` : undefined,
      className: errors[field] ? 'input-control invalid' : 'input-control',
      onChange: (event) => updateField(field, event.target.value),
    };
  }

  const selectedBus = buses.find((bus) => bus.value === values.bus);

  return (
    <div className="app-shell" id="home">
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#home" aria-label="TourBus home">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none">
                <path
                  d="M7 22.5V10.8C7 8.7 8.7 7 10.8 7h10.4c2.1 0 3.8 1.7 3.8 3.8v11.7M7 17h18M10.5 22.5v2m11-2v2M10.5 12h11"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="11" cy="21" r="1.5" fill="currentColor" />
                <circle cx="21" cy="21" r="1.5" fill="currentColor" />
              </svg>
            </span>
            <span className="brand-name">Tour<span>Bus</span></span>
          </a>

          <nav className="main-nav" aria-label="Main navigation">
            <a href="#home">Home</a>
            <a className="active" href="#booking-form">Booking Form</a>
          </nav>

          <span className="header-tag">
            <span className="status-dot" />
            Passenger Validation
          </span>
        </div>
      </header>

      <main>
        <section className="page-intro" aria-labelledby="page-title">
          <div className="intro-inner">
            <div className="eyebrow"><span /> YOUR JOURNEY STARTS HERE</div>
            <h1 id="page-title">Passenger Information</h1>
            <p>Enter your passenger details to continue your journey.</p>
            <div className="secure-note">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 2.5 4 5v4.6c0 3.7 2.6 6.5 6 7.9 3.4-1.4 6-4.2 6-7.9V5l-6-2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="m7.5 9.8 1.7 1.7 3.4-3.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Your details stay in this browser for this validation demo.
            </div>
          </div>
        </section>

        <div className="content-layout" id="booking-form">
          <section className="form-card" aria-labelledby="form-title">
            <div className="card-heading">
              <div>
                <span className="step-label">PASSENGER DETAILS</span>
                <h2 id="form-title">Let&apos;s get you on board</h2>
                <p>All fields marked <span className="required-mark">*</span> are required.</p>
              </div>
              <span className="form-step"><span>1</span> OF 1</span>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-grid">
                <Field id="fullName" label="Passenger Full Name" error={errors.fullName}>
                  {({ errorId }) => (
                    <div className="input-wrap">
                      <span className="input-icon" aria-hidden="true">
                        <svg viewBox="0 0 20 20" fill="none">
                          <circle cx="10" cy="6.2" r="3" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M4.5 16v-1.2a5.5 5.5 0 0 1 11 0V16h-11Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <input
                        {...inputProps('fullName')}
                        type="text"
                        autoComplete="name"
                        placeholder="e.g. Rahul Sharma"
                        maxLength={60}
                        aria-describedby={errors.fullName ? errorId : undefined}
                      />
                    </div>
                  )}
                </Field>

                <Field id="email" label="Email Address" error={errors.email}>
                  {({ errorId }) => (
                    <div className="input-wrap">
                      <span className="input-icon" aria-hidden="true">
                        <svg viewBox="0 0 20 20" fill="none">
                          <rect x="3" y="4.5" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
                          <path d="m4 6 6 4.5L16 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <input
                        {...inputProps('email')}
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        maxLength={254}
                        aria-describedby={errors.email ? errorId : undefined}
                      />
                    </div>
                  )}
                </Field>

                <Field id="mobile" label="Mobile Number" error={errors.mobile}>
                  {({ errorId }) => (
                    <div className="input-wrap">
                      <span className="country-code">+91</span>
                      <input
                        {...inputProps('mobile')}
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        placeholder="10-digit mobile number"
                        maxLength={10}
                        onChange={(event) =>
                          updateField('mobile', event.target.value.replace(/\D/g, '').slice(0, 10))
                        }
                        aria-describedby={errors.mobile ? errorId : undefined}
                      />
                    </div>
                  )}
                </Field>

                <Field id="age" label="Age" error={errors.age}>
                  {({ errorId }) => (
                    <div className="input-wrap">
                      <span className="input-icon" aria-hidden="true">
                        <svg viewBox="0 0 20 20" fill="none">
                          <circle cx="10" cy="6.2" r="3" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M4.5 16v-1.2a5.5 5.5 0 0 1 11 0V16h-11Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <input
                        {...inputProps('age')}
                        type="number"
                        inputMode="numeric"
                        min="5"
                        max="100"
                        step="1"
                        placeholder="Between 5 and 100"
                        aria-describedby={errors.age ? errorId : undefined}
                      />
                    </div>
                  )}
                </Field>

                <Field id="bus" label="Select Bus" error={errors.bus}>
                  {({ errorId }) => (
                    <select {...inputProps('bus')} aria-describedby={errors.bus ? errorId : undefined}>
                      <option value="">Select Bus</option>
                      {buses.map((bus) => (
                        <option key={bus.value} value={bus.value}>
                          {bus.value} – {bus.name}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>

                <Field id="journeyDate" label="Journey Date" error={errors.journeyDate}>
                  {({ errorId }) => (
                    <input
                      {...inputProps('journeyDate')}
                      type="date"
                      min={getToday()}
                      aria-describedby={errors.journeyDate ? errorId : undefined}
                    />
                  )}
                </Field>

                <Field id="seat" label="Select Seat" error={errors.seat}>
                  {({ errorId }) => (
                    <select {...inputProps('seat')} aria-describedby={errors.seat ? errorId : undefined}>
                      <option value="">Select Seat</option>
                      {seats.map((seat) => (
                        <option key={seat} value={seat}>{seat}</option>
                      ))}
                    </select>
                  )}
                </Field>
              </div>

              <div className={`terms-row${errors.acceptedTerms ? ' has-error' : ''}`}>
                <input
                  id="acceptedTerms"
                  name="acceptedTerms"
                  type="checkbox"
                  checked={values.acceptedTerms}
                  aria-invalid={Boolean(errors.acceptedTerms)}
                  aria-describedby={errors.acceptedTerms ? 'acceptedTerms-error' : undefined}
                  onChange={(event) => updateField('acceptedTerms', event.target.checked)}
                />
                <label htmlFor="acceptedTerms">
                  I have read and agree to the <a href="#terms-note">terms and conditions</a>.
                </label>
              </div>
              {errors.acceptedTerms && (
                <p className="field-error terms-error" id="acceptedTerms-error" role="alert">
                  <span aria-hidden="true">!</span>
                  {errors.acceptedTerms}
                </p>
              )}

              <div className="form-actions">
                <button className="submit-button" type="submit">
                  Validate Booking
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button className="reset-button" type="button" onClick={handleReset}>
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M3.5 10a6.5 6.5 0 1 0 1.9-4.6L3.5 7.3M3.5 3.8v3.5H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Reset Form
                </button>
              </div>
            </form>

            {isValidated && (
              <section className="success-panel" aria-live="polite">
                <div className="success-heading">
                  <span className="success-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="m6 12.5 4 4 8-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div>
                    <h3>Booking Details Validated Successfully!</h3>
                    <p>Your details passed client-side validation.</p>
                  </div>
                </div>
                <div className="confirmation-card">
                  <div className="confirmation-title">
                    <span>VALIDATION SUMMARY</span>
                    <span className="demo-badge">DEMO ONLY</span>
                  </div>
                  <div className="summary-grid">
                    <div><span>Passenger</span><strong>{values.fullName.trim()}</strong></div>
                    <div><span>Email</span><strong>{values.email.trim()}</strong></div>
                    <div><span>Mobile</span><strong>+91 {values.mobile}</strong></div>
                    <div><span>Bus</span><strong>{selectedBus?.value} – {selectedBus?.name}</strong></div>
                    <div><span>Journey date</span><strong>{values.journeyDate}</strong></div>
                    <div><span>Seat</span><strong>{values.seat}</strong></div>
                  </div>
                  <p className="demo-disclaimer">No booking has been made or saved. This is a client-side validation demonstration.</p>
                </div>
              </section>
            )}
          </section>

          <aside className="journey-aside" aria-label="Booking information">
            <div className="aside-top">
              <span className="aside-kicker">TRAVEL WITH CONFIDENCE</span>
              <h2>A better journey begins with the details.</h2>
              <p>Share a few details and we&apos;ll check that everything is ready for the road ahead.</p>
            </div>

            <div className="route-art">
              <img
                className="bus-photo"
                src="/bus-travel.jpg"
                alt="A modern coach bus ready for a long-distance journey"
              />
              <span className="photo-caption">The road is calling.</span>
            </div>

            <div className="aside-points">
              <div className="aside-point">
                <span className="point-icon">01</span>
                <div><strong>Enter your details</strong><span>Tell us who&apos;s travelling.</span></div>
              </div>
              <div className="aside-point">
                <span className="point-icon">02</span>
                <div><strong>Check your information</strong><span>See field-by-field feedback.</span></div>
              </div>
              <div className="aside-point">
                <span className="point-icon">03</span>
                <div><strong>Ready to hit the road</strong><span>Get a local validation summary.</span></div>
              </div>
            </div>

            <p className="privacy-note" id="terms-note">
              <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M9 2 3.5 4.3v4.2c0 3.4 2.4 5.9 5.5 7.2 3.1-1.3 5.5-3.8 5.5-7.2V4.3L9 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
              This demo does not submit or store passenger information.
            </p>
          </aside>
        </div>
      </main>

      <footer className="site-footer">
        <span>© {new Date().getFullYear()} TourBus</span>
        <span>Passenger validation demo · Built with React</span>
      </footer>
    </div>
  );
}

export default App;
