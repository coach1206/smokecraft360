/**
 * Legal — /legal
 * Terms of Service + Privacy Policy + acceptable-use for Axiom OS.
 *
 * Accessible without authentication (public).
 * Tab switcher: Terms of Service | Privacy Policy | Acceptable Use
 */

import { useState }         from "react";
import { useLocation }      from "wouter";
import { ArrowLeft }        from "lucide-react";

const T = {
  bg:        "#06040a",
  surface:   "rgba(255,255,255,0.04)",
  border:    "rgba(201,168,76,0.18)",
  gold:      "#c9a84c",
  text:      "rgba(240,232,212,0.92)",
  textMuted: "rgba(240,232,212,0.55)",
  textLight: "rgba(240,232,212,0.75)",
};

const SECTIONS = [
  { id: "terms",   label: "Terms of Service" },
  { id: "privacy", label: "Privacy Policy"   },
  { id: "aup",     label: "Acceptable Use"   },
];

const EFFECTIVE_DATE = "May 6, 2026";

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: 15, fontWeight: 600, color: T.gold,
      fontFamily: "'Cormorant Garamond', serif",
      letterSpacing: "0.04em", marginTop: 28, marginBottom: 8,
    }}>
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 12, lineHeight: 1.75, color: T.textLight, margin: "0 0 10px" }}>
      {children}
    </p>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ fontSize: 12, lineHeight: 1.75, color: T.textLight, marginBottom: 4 }}>
      {children}
    </li>
  );
}

// ── Terms of Service ──────────────────────────────────────────────────────────

function TermsContent() {
  return (
    <div>
      <H2>1. Agreement to Terms</H2>
      <P>
        By accessing or using the Axiom OS platform ("Platform"), you agree to be bound by
        these Terms of Service ("Terms"). If you do not agree, do not access or use the Platform.
      </P>

      <H2>2. Description of Service</H2>
      <P>
        Axiom OS is a luxury hospitality operating platform providing AI-powered recommendations,
        inventory management, loyalty systems, kiosk management, payment processing via Stripe
        Connect, and related services ("Services") to licensed venues.
      </P>

      <H2>3. Account Registration & Venue Access</H2>
      <P>
        Venue operators must register an account and provide accurate, complete information.
        You are responsible for all activity that occurs under your credentials. Accounts are
        non-transferable. Axiom reserves the right to suspend accounts that violate these Terms.
      </P>

      <H2>4. Subscription & Billing</H2>
      <P>
        Access to paid features requires an active subscription. By subscribing, you authorize
        Axiom to charge the payment method on file at the beginning of each billing cycle.
        Subscriptions automatically renew unless cancelled before the renewal date. All fees
        are non-refundable except as required by applicable law.
      </P>

      <H2>5. Payment Processing (Stripe Connect)</H2>
      <P>
        Payment processing for guest transactions is facilitated through Stripe Connect. Venue
        operators are required to complete Stripe's Express onboarding to accept payments. Axiom
        collects a platform fee (default 5.00%) on each processed transaction. Dispute resolution
        for guest charges is handled per Stripe's policies.
      </P>

      <H2>6. Data Ownership</H2>
      <P>
        Venues retain ownership of their operational data (guest profiles, orders, inventory).
        Axiom retains a license to use anonymized, aggregated data for platform improvement and
        analytics. Personal data handling is described in the Privacy Policy.
      </P>

      <H2>7. Prohibited Conduct</H2>
      <ul style={{ paddingLeft: 20, marginBottom: 10 }}>
        <Li>Reverse engineering or attempting to extract source code from the Platform</Li>
        <Li>Using the Platform to facilitate illegal activity or fraud</Li>
        <Li>Circumventing payment processing or loyalty systems</Li>
        <Li>Sharing credentials or enabling unauthorized access</Li>
        <Li>Sending spam or unsolicited communications via Platform channels</Li>
      </ul>

      <H2>8. Intellectual Property</H2>
      <P>
        All Platform software, UI designs, AI models, and Axiom OS branding are owned by Axiom.
        Venues are granted a limited, non-exclusive license to use the Platform during an active
        subscription. No ownership rights are transferred.
      </P>

      <H2>9. Service Availability</H2>
      <P>
        Axiom targets 99.5% uptime but does not guarantee uninterrupted service. Scheduled
        maintenance will be communicated in advance. Axiom is not liable for losses resulting
        from service interruptions.
      </P>

      <H2>10. Limitation of Liability</H2>
      <P>
        To the maximum extent permitted by law, Axiom's liability for any claim arising out of
        these Terms shall not exceed the fees paid by the venue in the three months preceding
        the claim. Axiom is not liable for indirect, incidental, or consequential damages.
      </P>

      <H2>11. Termination</H2>
      <P>
        Either party may terminate the agreement with 30 days' written notice. Axiom may
        terminate immediately for material breach, non-payment, or illegal activity. Upon
        termination, venue data export will be made available for 30 days.
      </P>

      <H2>12. Governing Law</H2>
      <P>
        These Terms are governed by the laws of the State of Delaware, United States. Disputes
        shall be resolved by binding arbitration under AAA rules, except either party may seek
        injunctive relief in a court of competent jurisdiction.
      </P>

      <H2>13. Changes to Terms</H2>
      <P>
        Axiom may update these Terms with 14 days' notice. Continued use after the effective
        date constitutes acceptance. Material changes will be communicated via email and
        in-platform notification.
      </P>
    </div>
  );
}

// ── Privacy Policy ────────────────────────────────────────────────────────────

function PrivacyContent() {
  return (
    <div>
      <H2>1. Information We Collect</H2>
      <P>We collect the following categories of information:</P>
      <ul style={{ paddingLeft: 20, marginBottom: 10 }}>
        <Li><strong style={{ color: T.text }}>Account Data:</strong> Name, email, role, venue association</Li>
        <Li><strong style={{ color: T.text }}>Guest Profiles:</strong> First name, initial, flavor preferences, session history (kiosk-enrolled guests)</Li>
        <Li><strong style={{ color: T.text }}>Transaction Data:</strong> Order amounts, loyalty points, payment status (via Stripe)</Li>
        <Li><strong style={{ color: T.text }}>Device Data:</strong> Kiosk device IDs, IP addresses, heartbeat timestamps</Li>
        <Li><strong style={{ color: T.text }}>Usage Data:</strong> Analytics events, swipe interactions, recommendation clicks</Li>
        <Li><strong style={{ color: T.text }}>NDA Signatures:</strong> IP logs, timestamps, signature content for legal-evidence purposes</Li>
      </ul>

      <H2>2. How We Use Your Information</H2>
      <ul style={{ paddingLeft: 20, marginBottom: 10 }}>
        <Li>Providing and improving Platform Services</Li>
        <Li>Processing payments and maintaining financial records</Li>
        <Li>Generating AI-powered recommendations personalized to guest preferences</Li>
        <Li>Sending service notifications and billing communications</Li>
        <Li>Fraud detection, security monitoring, and audit compliance</Li>
        <Li>Aggregated, anonymized analytics for platform improvement</Li>
      </ul>

      <H2>3. Payment Data</H2>
      <P>
        Axiom does not store raw card numbers. Payment processing is handled by Stripe, Inc.
        Axiom stores Stripe customer IDs, payment intent IDs, and transaction metadata. Guest
        payment data is subject to Stripe's Privacy Policy (stripe.com/privacy).
      </P>

      <H2>4. Data Sharing</H2>
      <P>We share data with:</P>
      <ul style={{ paddingLeft: 20, marginBottom: 10 }}>
        <Li><strong style={{ color: T.text }}>Stripe:</strong> Payment processing and Connect payouts</Li>
        <Li><strong style={{ color: T.text }}>Cloudinary:</strong> Image storage and transformation</Li>
        <Li><strong style={{ color: T.text }}>ElevenLabs:</strong> Voice synthesis (text content only, no PII)</Li>
        <Li><strong style={{ color: T.text }}>Service Providers:</strong> Hosting, database, monitoring (under data processing agreements)</Li>
      </ul>
      <P>We do not sell personal data to third parties.</P>

      <H2>5. Data Retention</H2>
      <P>
        Guest profile data is retained for the duration of the venue's subscription plus 12
        months. Transaction records are retained for 7 years for compliance purposes. Audit
        logs are append-only and retained for the life of the account. NDA signatures are
        retained permanently as legal evidence.
      </P>

      <H2>6. Guest Rights</H2>
      <P>
        Guests enrolled via kiosk may request access to, correction of, or deletion of their
        profile data by contacting the venue operator. Venue operators may process these
        requests through the Platform's guest management tools.
      </P>

      <H2>7. Security</H2>
      <P>
        Axiom uses AES-256-GCM field-level encryption for sensitive data, TLS 1.2+ for all
        communications, JWT-based authentication with role-based access control, and append-only
        audit logs for all financial and administrative actions.
      </P>

      <H2>8. Cookies & Tracking</H2>
      <P>
        The Platform uses session tokens (localStorage) for authentication. No third-party
        advertising trackers are used. Analytics are first-party only.
      </P>

      <H2>9. Children's Privacy</H2>
      <P>
        The Platform is designed for adult hospitality environments. We do not knowingly collect
        data from individuals under 21 years of age.
      </P>

      <H2>10. Contact</H2>
      <P>
        Privacy inquiries: privacy@axiom.os · Axiom OS, Inc., 251 Little Falls Drive,
        Wilmington, DE 19808, United States.
      </P>
    </div>
  );
}

// ── Acceptable Use Policy ─────────────────────────────────────────────────────

function AupContent() {
  return (
    <div>
      <H2>1. Purpose</H2>
      <P>
        This Acceptable Use Policy ("AUP") defines the boundaries of permitted use of the
        Axiom OS Platform. All venue operators, staff, and guests must comply with this AUP.
      </P>

      <H2>2. Permitted Use</H2>
      <ul style={{ paddingLeft: 20, marginBottom: 10 }}>
        <Li>Operating a licensed hospitality venue using Axiom OS features</Li>
        <Li>Processing lawful guest transactions and loyalty interactions</Li>
        <Li>Managing inventory, staff, and operational workflows</Li>
        <Li>Accessing AI recommendations for personal service enhancement</Li>
        <Li>Using kiosk features in the intended guest-facing context</Li>
      </ul>

      <H2>3. Prohibited Use</H2>
      <ul style={{ paddingLeft: 20, marginBottom: 10 }}>
        <Li>Attempting to access another venue's data (tenant isolation violation)</Li>
        <Li>Scripting or automating payment or loyalty transactions for fraudulent gain</Li>
        <Li>Using the Platform for money laundering or other financial crimes</Li>
        <Li>Circumventing age verification or NDA signature requirements</Li>
        <Li>Overloading Platform infrastructure through automated requests</Li>
        <Li>Exporting or scraping data for competitive intelligence purposes</Li>
        <Li>Using the Platform to facilitate discrimination or illegal conduct</Li>
      </ul>

      <H2>4. AI & Automation Authorization</H2>
      <P>
        By using Axiom's AI recommendation, environment automation, and campaign trigger systems,
        venue operators authorize Axiom to process guest and operational data using automated
        decision-making for the purpose of enhancing hospitality outcomes. Operators may disable
        specific AI features via Platform feature flags at any time.
      </P>

      <H2>5. Marketing Consent</H2>
      <P>
        Venue operators are responsible for obtaining appropriate consent before using Axiom's
        communication features (SMS, email) for marketing purposes. Axiom provides tooling;
        compliance with CAN-SPAM, TCPA, GDPR, and applicable laws is the venue operator's
        responsibility.
      </P>

      <H2>6. Recurring Billing Authorization</H2>
      <P>
        By activating a subscription, venue operators expressly authorize Axiom to charge their
        payment method on a recurring basis per the selected plan. This authorization remains in
        effect until cancelled in accordance with these Terms.
      </P>

      <H2>7. Enforcement</H2>
      <P>
        Violations of this AUP may result in immediate suspension, termination of service,
        and/or legal action. Axiom reserves the right to investigate suspected violations and
        cooperate with law enforcement as required.
      </P>

      <H2>8. Reporting Abuse</H2>
      <P>
        To report suspected AUP violations: abuse@axiom.os
      </P>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Legal() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState("terms");

  return (
    <div style={{
      minHeight: "100vh", background: T.bg, color: T.text,
      fontFamily: "'Inter', 'SF Pro Display', sans-serif",
    }}>

      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 40,
        background: `${T.bg}ee`, backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${T.border}`,
        padding: "12px 24px",
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <button onClick={() => navigate("/")} style={{
          background: "transparent", border: `1px solid ${T.border}`,
          borderRadius: 8, color: T.textMuted, fontSize: 11,
          padding: "6px 12px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <ArrowLeft size={12} /> Back
        </button>
        <div>
          <div style={{
            fontSize: 18, fontWeight: 700, color: T.gold,
            fontFamily: "'Cormorant Garamond', serif", letterSpacing: "0.06em",
          }}>
            Legal
          </div>
          <div style={{ fontSize: 10, color: T.textMuted, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Effective {EFFECTIVE_DATE}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: "flex", gap: 0,
        borderBottom: `1px solid ${T.border}`,
        padding: "0 24px", overflowX: "auto",
      }}>
        {SECTIONS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              padding: "12px 20px",
              border: "none", borderBottom: tab === id ? `2px solid ${T.gold}` : "2px solid transparent",
              background: "transparent", cursor: "pointer",
              fontSize: 12, fontWeight: tab === id ? 600 : 400,
              color: tab === id ? T.gold : T.textMuted,
              whiteSpace: "nowrap", transition: "color 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "32px 24px", maxWidth: 760 }}>
        {tab === "terms"   && <TermsContent   />}
        {tab === "privacy" && <PrivacyContent />}
        {tab === "aup"     && <AupContent     />}

        <div style={{
          marginTop: 40, paddingTop: 20, borderTop: `1px solid ${T.border}`,
          fontSize: 10, color: T.textMuted,
        }}>
          Axiom OS, Inc. · Effective {EFFECTIVE_DATE} · Questions: legal@axiom.os
        </div>
      </div>
    </div>
  );
}
