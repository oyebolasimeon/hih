"use client";

import { useRef, useState } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import AnimatedSection from "./AnimatedSection";

type FormStatus = "idle" | "sending" | "success" | "error";

const MIN_SUBMIT_MS = 3000;
const RATE_LIMIT_MS = 60_000;
const RATE_LIMIT_KEY = "nova_contact_last_submit";

function getLastSubmitAt(): number {
  try {
    return Number(sessionStorage.getItem(RATE_LIMIT_KEY) || 0);
  } catch {
    return 0;
  }
}

function setLastSubmitAt(timestamp: number) {
  try {
    sessionStorage.setItem(RATE_LIMIT_KEY, String(timestamp));
  } catch {
    // Ignore storage failures (private mode, etc.)
  }
}

export default function Contact() {
  const formOpenedAt = useRef(Date.now());
  const turnstileRef = useRef<TurnstileInstance>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  // Honeypot — humans never see this; bots often fill it
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Cloudflare dummy keys for local-dev hostname support; real key in production
  const siteKey =
    process.env.NODE_ENV === "development"
      ? "1x00000000000000000000AA"
      : (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "");

  const resetTurnstile = () => {
    turnstileRef.current?.reset();
    setTurnstileToken("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    // 1) Honeypot filled → pretend success, don't send
    if (website.trim()) {
      setStatus("success");
      setFormData({ name: "", email: "", phone: "", message: "" });
      setWebsite("");
      return;
    }

    // 2) Submitted too fast → likely a bot
    const elapsed = Date.now() - formOpenedAt.current;
    if (elapsed < MIN_SUBMIT_MS) {
      setStatus("error");
      setErrorMessage(
        "Please take a moment to review your message, then try again."
      );
      return;
    }

    // 3) Client-side rate limit (1 message per minute in this browser)
    const now = Date.now();
    const lastSubmit = getLastSubmitAt();
    if (lastSubmit && now - lastSubmit < RATE_LIMIT_MS) {
      const waitSec = Math.ceil((RATE_LIMIT_MS - (now - lastSubmit)) / 1000);
      setStatus("error");
      setErrorMessage(
        `Please wait ${waitSec} second${waitSec === 1 ? "" : "s"} before sending another message.`
      );
      return;
    }

    if (!turnstileToken) {
      setStatus("error");
      setErrorMessage("Please complete the security check and try again.");
      return;
    }

    const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY;
    if (!accessKey) {
      setStatus("error");
      setErrorMessage(
        "Form is not configured yet. Please email us directly at admin@novaelitehomes.co.uk."
      );
      return;
    }

    try {
      // 1) Server: validate fields + Cloudflare Turnstile
      const verifyResponse = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          message: formData.message,
          website,
          turnstileToken,
        }),
      });

      const verifyData = (await verifyResponse.json()) as {
        success?: boolean;
        skipSend?: boolean;
        message?: string;
      };

      if (!verifyData.success) {
        setStatus("error");
        setErrorMessage(
          verifyData.message || "Something went wrong. Please try again."
        );
        resetTurnstile();
        return;
      }

      // Honeypot path from API — fake success, never email
      if (verifyData.skipSend) {
        setStatus("success");
        setFormData({ name: "", email: "", phone: "", message: "" });
        setWebsite("");
        resetTurnstile();
        return;
      }

      // 2) Browser → Web3Forms (works on free plan; cPanel server IPs are often blocked)
      const sendResponse = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: accessKey,
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          message: formData.message.trim(),
          subject: `New enquiry from ${formData.name.trim()}`,
          from_name: "Nova Elite Homes",
          botcheck: false,
        }),
      });

      const sendData = (await sendResponse.json()) as {
        success?: boolean;
        message?: string;
      };

      if (sendData.success) {
        setLastSubmitAt(now);
        formOpenedAt.current = Date.now();
        setStatus("success");
        setFormData({ name: "", email: "", phone: "", message: "" });
        setWebsite("");
        resetTurnstile();
      } else {
        setStatus("error");
        setErrorMessage(
          sendData.message || "Something went wrong. Please try again."
        );
        resetTurnstile();
      }
    } catch {
      setStatus("error");
      setErrorMessage(
        "Unable to send your message. Please try again or email admin@novaelitehomes.co.uk."
      );
      resetTurnstile();
    }
  };

  return (
    <section id="contact" className="py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <AnimatedSection>
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-brand font-medium text-sm uppercase tracking-wider">
              Contact Us
            </p>
            <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
              Ready to find your perfect accommodation?
            </h2>
            <p className="mt-3 sm:mt-4 text-muted text-sm sm:text-base">
              Get in touch with our team to discuss your requirements. We&apos;re
              here to help.
            </p>
          </div>
        </AnimatedSection>

        <div className="mt-10 sm:mt-16 grid lg:grid-cols-3 gap-8 sm:gap-12">
          <AnimatedSection delay={0.1}>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4 sm:gap-6">
              <div className="p-5 sm:p-6 border border-border rounded-lg hover:border-brand/30 transition-colors">
                <div className="w-10 h-10 rounded-full bg-brand-subtle flex items-center justify-center mb-3 sm:mb-4">
                  <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-foreground text-sm sm:text-base">Phone</h4>
                <a href="tel:03302296964" className="text-muted hover:text-brand transition-colors text-sm">
                  0330 229 6964
                </a>
              </div>

              <div className="p-5 sm:p-6 border border-border rounded-lg hover:border-brand/30 transition-colors">
                <div className="w-10 h-10 rounded-full bg-brand-subtle flex items-center justify-center mb-3 sm:mb-4">
                  <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-foreground text-sm sm:text-base">Email</h4>
                <a href="mailto:admin@novaelitehomes.co.uk" className="text-muted hover:text-brand transition-colors text-xs sm:text-sm break-all">
                  admin@novaelitehomes.co.uk
                </a>
              </div>

              <div className="p-5 sm:p-6 border border-border rounded-lg hover:border-brand/30 transition-colors">
                <div className="w-10 h-10 rounded-full bg-brand-subtle flex items-center justify-center mb-3 sm:mb-4">
                  <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4h16v16H4V4zm4 0v16m8-16v16M4 8h16M4 16h16" />
                  </svg>
                </div>
                <h4 className="font-semibold text-foreground text-sm sm:text-base">Instagram</h4>
                <a href="https://instagram.com/novaelitehomes" target="_blank" rel="noopener noreferrer" className="text-muted hover:text-brand transition-colors text-sm">
                  @novaelitehomes
                </a>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2} className="lg:col-span-2">
            <form
              onSubmit={handleSubmit}
              className="relative p-5 sm:p-8 border border-border rounded-lg bg-surface"
            >
              {/* Honeypot — visually hidden from people/screen readers, attractive to bots */}
              <div
                className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden"
                aria-hidden="true"
              >
                <label htmlFor="website">Website</label>
                <input
                  type="text"
                  id="website"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    minLength={2}
                    maxLength={100}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-border rounded-md text-foreground placeholder:text-muted/50 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all text-sm sm:text-base"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    maxLength={254}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-border rounded-md text-foreground placeholder:text-muted/50 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all text-sm sm:text-base"
                    placeholder="your@email.com"
                  />
                </div>
              </div>
              <div className="mt-4 sm:mt-5">
                <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  maxLength={30}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-border rounded-md text-foreground placeholder:text-muted/50 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all text-sm sm:text-base"
                  placeholder="Your phone number"
                />
              </div>
              <div className="mt-4 sm:mt-5">
                <label htmlFor="message" className="block text-sm font-medium text-foreground mb-1.5">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-border rounded-md text-foreground placeholder:text-muted/50 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-all resize-none text-sm sm:text-base"
                  placeholder="Tell us about your accommodation needs..."
                />
              </div>

              {siteKey ? (
                <div className="mt-4 sm:mt-5">
                  <Turnstile
                    ref={turnstileRef}
                    siteKey={siteKey}
                    options={{ theme: "light", size: "normal" }}
                    onSuccess={setTurnstileToken}
                    onExpire={() => setTurnstileToken("")}
                    onError={() => {
                      setTurnstileToken("");
                      setErrorMessage(
                        "Security check failed to load. Please refresh the page."
                      );
                    }}
                  />
                </div>
              ) : null}

              {status === "success" && (
                <p className="mt-4 text-sm text-foreground" role="status">
                  Thank you — your message has been sent. We&apos;ll get back to you soon.
                </p>
              )}
              {status === "error" && (
                <p className="mt-4 text-sm text-red-700" role="alert">
                  {errorMessage}
                </p>
              )}

              <div className="mt-5 sm:mt-6">
                <button
                  type="submit"
                  disabled={status === "sending" || (!!siteKey && !turnstileToken)}
                  className="w-full sm:w-auto px-8 py-3 sm:py-3.5 bg-brand text-foreground font-semibold rounded-md hover:bg-brand-dark transition-colors text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {status === "sending" ? "Sending..." : "Send Message"}
                </button>
              </div>
            </form>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
