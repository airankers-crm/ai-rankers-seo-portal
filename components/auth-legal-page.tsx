import Image from "next/image";
import Link from "next/link";

type LegalPageKind = "privacy" | "terms";

type LegalSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

const legalContent: Record<LegalPageKind, {
  eyebrow: string;
  title: string;
  intro: string;
  sections: LegalSection[];
  alternateKind: LegalPageKind;
}> = {
  privacy: {
    eyebrow: "Legal / Privacy",
    title: "Privacy policy",
    intro: "A clear overview of how The AI Rankers handles information used to provide the SEO Portal.",
    alternateKind: "terms",
    sections: [
      { heading: "Information we collect", paragraphs: ["We collect the information needed to provide secure portal access and reporting, including account details, client workspace details, reporting values, support messages, and basic technical information about portal use."] },
      { heading: "How we use information", paragraphs: ["Information is used to authenticate users, operate client workspaces, publish approved reporting, process imports and provider syncs, respond to support requests, maintain security, and improve the reliability of the portal."] },
      { heading: "Reporting sources and visibility", paragraphs: ["Workspace reporting may include values entered by an administrator, Excel imports, or connected provider APIs such as Google services. Client-facing values are shown according to the workspace publishing and visibility controls. Provider credentials remain restricted to authorized administrators."] },
      { heading: "Sharing and service providers", paragraphs: ["We do not sell portal information. Information may be processed by trusted infrastructure and service providers only when needed to host the application, store data, authenticate users, deliver files, or provide connected reporting services. We may disclose information when required by law or to protect the portal and its users."] },
      { heading: "Retention and deletion", paragraphs: ["Information is retained while a client workspace is active or while it is needed for reporting, security, audit, or contractual purposes. To ask about access, correction, export, or deletion, contact The AI Rankers support team. Client agreements may provide additional retention requirements."] },
      { heading: "Security", paragraphs: ["The portal uses authenticated access, workspace-scoped permissions, controlled publishing, and audit-aware administrative workflows. No internet service can guarantee absolute security, so users should protect their credentials and report suspected unauthorized access promptly."] },
      { heading: "Your choices", paragraphs: ["You may request help with account access, workspace information, or portal data by contacting support. We may need to verify the request and the requester’s relationship to the relevant workspace before making changes."] },
      { heading: "Contact", paragraphs: ["For privacy questions or requests, email support@theairankers.com. This product policy summary does not replace any privacy terms in an applicable client agreement."] },
    ],
  },
  terms: {
    eyebrow: "Legal / Terms",
    title: "Terms of service",
    intro: "The operating terms for using The AI Rankers SEO Portal and its agency workspace features.",
    alternateKind: "privacy",
    sections: [
      { heading: "About the portal", paragraphs: ["The AI Rankers SEO Portal provides authenticated client reporting and agency operations tools, including workspace management, approved performance reports, provider data connections, imports, feedback, and administrative controls."] },
      { heading: "Account access", paragraphs: ["Users must provide accurate account information, keep credentials confidential, and use only the workspace access assigned to them. You are responsible for activity performed through your account and should notify the support team if access may have been compromised."] },
      { heading: "Authorized use", paragraphs: ["You may use the portal only for legitimate business reporting, workspace administration, and communication with the relevant agency team. Do not attempt to bypass permissions, access another workspace, interfere with the service, upload malicious content, or use the portal to violate applicable law."] },
      { heading: "Reporting data and integrations", paragraphs: ["Reporting values may come from administrator entries, Excel imports, or connected provider APIs. Data can be delayed, incomplete, changed by the source provider, or awaiting approval. The portal presents reporting information and does not guarantee a particular ranking, lead volume, conversion result, or business outcome."] },
      { heading: "Client responsibilities", paragraphs: ["Workspace owners and administrators are responsible for confirming business details, selecting authorized users, reviewing imported or synced values, and approving content before it is published to a client portal. Users should not upload information they are not authorized to share."] },
      { heading: "Availability and changes", paragraphs: ["We may update, improve, suspend, or retire features as the portal evolves. Planned changes will be handled with reasonable care, but availability may be affected by maintenance, provider outages, network issues, or events outside our control."] },
      { heading: "Ownership", paragraphs: ["The portal, its software, design, branding, and documentation remain the property of The AI Rankers or its licensors. Workspace data and client-provided materials remain subject to the applicable client or agency agreement."] },
      { heading: "Suspension and termination", paragraphs: ["Access may be suspended or ended when required for security, non-payment, misuse, legal compliance, workspace closure, or the end of the applicable client relationship. We will use reasonable efforts to preserve or return workspace information according to the applicable agreement."] },
      { heading: "Contact", paragraphs: ["Questions about these terms or access to the portal can be sent to support@theairankers.com. These product terms are intended to work alongside, not replace, any signed client agreement."] },
    ],
  },
};

export function AuthLegalPage({ kind }: { kind: LegalPageKind }) {
  const content = legalContent[kind];
  const alternateLabel = content.alternateKind === "privacy" ? "Privacy policy" : "Terms of service";

  return (
    <main className="auth-page auth-legal-page">
      <section className="auth-legal-shell" aria-labelledby="legal-title">
        <header className="auth-legal-header">
          <Link className="auth-logo" href="/" aria-label="The AI Rankers home">
            <Image className="auth-logo-image" src="/branding/ai-rankers/brand_logo.png" alt="The AI Rankers" width={183} height={59} priority />
          </Link>
          <Link className="auth-legal-back" href="/auth/sign-in">Back to sign in</Link>
        </header>

        <div className="auth-legal-intro">
          <p className="eyebrow">{content.eyebrow}</p>
          <h1 id="legal-title">{content.title}</h1>
          <p>{content.intro}</p>
          <div className="auth-legal-meta"><span>Last updated November 19, 2026</span><span>AI Rankers SEO Portal</span></div>
        </div>

        <div className="auth-legal-layout">
          <nav className="auth-legal-toc" aria-label="On this page">
            <span>On this page</span>
            {content.sections.map((section, index) => <a href={`#legal-section-${index + 1}`} key={section.heading}>{section.heading}</a>)}
          </nav>
          <article className="auth-legal-content">
            {content.sections.map((section, index) => <section id={`legal-section-${index + 1}`} key={section.heading}><h2>{section.heading}</h2>{section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{section.bullets ? <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}</section>)}
          </article>
        </div>

        <footer className="auth-legal-footer">
          <div><span>Questions about this document?</span><a href="mailto:support@theairankers.com">Contact The AI Rankers support</a></div>
          <div className="auth-legal-footer-links"><Link href={content.alternateKind === "privacy" ? "/privacy" : "/terms"}>{alternateLabel}</Link><Link href="/auth/sign-in">Back to sign in</Link></div>
        </footer>
      </section>
    </main>
  );
}
