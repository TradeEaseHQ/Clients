export const HOSTING_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  live: "bg-green-100 text-green-700",
  suspended: "bg-red-100 text-red-600",
};

export const TALLY_ONBOARDING_URL = "https://tally.so/r/Gx02ke";

export const ONBOARDING_STEPS = [
  { step: 1, label: "Send onboarding form", detail: "Copy the Tally link below and email it to the client." },
  { step: 2, label: "Create Formspree quote form", detail: "Go to formspree.io → New Form → enter client's email → copy endpoint URL → paste into Quote Form Action field below." },
  { step: 3, label: "Enter onboarding responses", detail: "Once client submits, copy their answers into the fields below (chat config, quote form action, notes)." },
  { step: 4, label: "Configure AI chat", detail: "Fill out the Chat Config section below with their services, hours, pricing, service areas." },
  { step: 5, label: "Finalize & Deploy", detail: "Click the deploy button below. Verify the site loads correctly." },
  { step: 6, label: "Send DNS instructions", detail: "Email the client: add CNAME record pointing their domain → cname.vercel-dns.com. Check their domain registrar guide if needed." },
  { step: 7, label: "Send contract", detail: "Fill in the service agreement template (docs/contract/), export to PDF, email for signature." },
  { step: 8, label: "Confirm everything is live", detail: "Check domain resolves, chat widget responds, quote form submits (check Formspree), SSL cert shows padlock." },
];
