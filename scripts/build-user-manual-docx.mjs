import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AlignmentType,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manualDirectory = path.join(root, "docs", "user-manual");
const screenshotDirectory = path.join(manualDirectory, "screenshots");
const outputPath = path.join(
  manualDirectory,
  "NDMU-ICT-MIS-Service-Desk-User-Manual.docx",
);

const green = "00452B";
const gold = "D5A928";
const gray = "52606D";

const text = (value, options = {}) =>
  new TextRun({ text: value, font: "Aptos", size: 20, ...options });

const paragraph = (value, options = {}) =>
  new Paragraph({
    children: [text(value, options.run)],
    spacing: { after: 120, line: 276 },
    ...options,
  });

const heading = (value, level = 1) =>
  new Paragraph({
    text: value,
    heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
    spacing: { before: level === 1 ? 180 : 120, after: 100 },
  });

const bullet = (value) =>
  new Paragraph({
    children: [text(value)],
    bullet: { level: 0 },
    spacing: { after: 70, line: 250 },
  });

const step = (value) =>
  new Paragraph({
    children: [text(value)],
    numbering: { reference: "steps", level: 0 },
    spacing: { after: 70, line: 250 },
  });

const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

const screenshot = (fileName, caption, height) => {
  const imagePath = path.join(screenshotDirectory, fileName);
  if (!fs.existsSync(imagePath)) return [];
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new ImageRun({
          data: fs.readFileSync(imagePath),
          type: "png",
          transformation: { width: 600, height },
        }),
      ],
      spacing: { before: 80, after: 30 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [text(caption, { italics: true, size: 16, color: gray })],
      spacing: { after: 140 },
    }),
  ];
};

const children = [
  new Paragraph({ spacing: { before: 1800 } }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text("NDMU ICT-MIS", { font: "Aptos Display", size: 58, bold: true, color: green })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text("Service Desk", { font: "Aptos Display", size: 48, bold: true, color: green })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text("User Manual", { font: "Aptos Display", size: 34, color: gold })],
    spacing: { after: 600 },
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text("Notre Dame of Marbel University", { size: 24, bold: true, color: gray })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text("For requestors, technicians, team leaders, and administrators", { size: 20, color: gray })],
    spacing: { after: 500 },
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [text("Version 1.0 | September 2026", { size: 18, color: gray })],
  }),
  pageBreak(),
  heading("Contents"),
  bullet("1. About the Service Desk"),
  bullet("2. Access and sign in"),
  bullet("3. Submit a support request"),
  bullet("4. Track a guest ticket"),
  bullet("5. Use the Knowledge Base"),
  bullet("6. Staff ticket workflow"),
  bullet("7. Administration and user accounts"),
  bullet("8. Security and troubleshooting"),
  heading("About the Service Desk"),
  paragraph("The NDMU ICT-MIS Service Desk is the central channel for requesting technology support, reporting incidents, tracking progress, and sharing updates with the ICT-MIS team."),
  paragraph("Guest submission remains available. A guest does not need an employee or student ID; the requestor identity is their full name, office or department, and email address. Contact details and location are optional unless the selected service requires them."),
  heading("Roles and access", 2),
  bullet("Requestor: submits requests, tracks progress, adds public replies, and confirms a resolution."),
  bullet("Technician: works assigned or team tickets, records troubleshooting, communicates with requestors, and resolves tickets."),
  bullet("Team leader: assigns work, oversees team queues, and reviews operational reports."),
  bullet("Administrator: manages accounts, teams, catalog items, locations, announcements, assets, and settings."),
  pageBreak(),
  heading("Access and sign in"),
  paragraph("Open the Service Desk in a supported browser. You can sign in with an NDMU Google account where configured, or use your institutional email and local password. Select Continue as Guest to submit or track a request without signing in."),
  ...screenshot("login.png", "Figure 1. Sign in screen and guest access entry point.", 417),
  heading("Sign in", 2),
  step("Enter your NDMU email address and password, then select Sign In."),
  step("Use the Google sign-in button when your account is configured for NDMU Google authentication."),
  step("After signing in, use the sidebar to open your tickets, staff work queues, reports, or administration pages based on your role."),
  pageBreak(),
  heading("Submit a support request"),
  paragraph("Choose Submit Request from the sidebar. Guest requestors provide a full name, institutional email, and, where applicable, department or college. Choose a category and specific service item, then supply a clear title and description."),
  ...screenshot("submit-ticket.png", "Figure 2. Guest request form with category and service selection.", 500),
  heading("Complete the request", 2),
  step("Select the category that best matches the issue, such as Accounts and Access, Network, Hardware and Devices, or Software and Systems."),
  step("Select the relevant service item. The form may show additional service-specific questions."),
  step("Describe the issue, including the exact location, affected device, error message, and when it began. Attach useful files or screenshots where available."),
  step("Select Submit request. Review the confirmation dialog and select Submit request again, or press Enter to confirm."),
  paragraph("After submission, keep the ticket number and tracking code. They are required to look up a guest request.", { run: { bold: true, color: green } }),
  pageBreak(),
  heading("Track a guest ticket"),
  paragraph("Guests can check progress at any time without a user account. Open Track Guest Ticket and enter the ticket reference number. Add the tracking code from the acknowledgement message for the most reliable lookup."),
  ...screenshot("track-ticket.png", "Figure 3. Guest ticket tracking form.", 417),
  heading("When viewing a ticket", 2),
  bullet("Review the current status, priority, assignment, and service details."),
  bullet("Use the secure guest link from the acknowledgement to send public replies or add attachments when enabled."),
  bullet("When a ticket is resolved, confirm the resolution and optionally provide a rating. Reopen only when the issue remains unresolved."),
  pageBreak(),
  heading("Use the Knowledge Base"),
  paragraph("Search the Knowledge Base before submitting a request. It contains maintained guidance for common campus technology tasks, including Wi-Fi access, institutional accounts, Schoology, and devices."),
  ...screenshot("knowledge-base.png", "Figure 4. Knowledge Base search and article categories.", 500),
  step("Enter a keyword in the search field or choose a category filter."),
  step("Open Read guide to view the article steps."),
  step("If the guide does not solve the problem, select Submit a request from the page."),
  pageBreak(),
  heading("Staff ticket workflow"),
  paragraph("Technicians and team leaders use the staff workspace to manage tickets from intake through resolution. Use the dashboard for workload visibility, My Tickets for assigned work, Unassigned for triage, and All Tickets for broader search and review."),
  heading("Triage and assignment", 2),
  step("Open an unassigned ticket and verify category, requestor details, priority, location, and attachments."),
  step("Assign the ticket to the appropriate team or technician. Team leaders should balance work using queue state and urgency."),
  step("Set or update the status as work begins. Record meaningful changes so the ticket history remains complete."),
  heading("Communication and resolution", 2),
  bullet("Use public replies for information the requestor should receive. Keep internal notes strictly internal; they are not shown in requestor-facing pages or notifications."),
  bullet("Record troubleshooting actions and relevant technical details in the ticket history."),
  bullet("When work is complete, add a concise resolution note and mark the ticket resolved. The requestor can confirm or reopen it."),
  pageBreak(),
  heading("Administration and user accounts"),
  paragraph("Administrators manage user access from Administration > Users. Create accounts with the user name, institutional email, role, department or location where applicable, an initial password, and active status."),
  heading("Create or edit a user", 2),
  step("Open Administration > Users and select Create account, or choose Edit for an existing account."),
  step("Enter the legal name, institutional email, role, and required access details."),
  step("For a new user, enter a temporary password of at least eight characters. For an existing user, leave the password blank to preserve it or enter a new value to reset it."),
  step("Use the eye icon beside the password field to show or hide the password while entering it."),
  step("Select Create account or Save changes. In the confirmation dialog, press Enter to activate the focused primary action, or click the action button."),
  heading("Other administration areas", 2),
  bullet("Catalog: maintain service categories, service items, dynamic intake fields, and service expectations."),
  bullet("Teams and locations: maintain staff groups and available office or campus locations. Disable referenced configuration rather than deleting it so historical tickets stay accurate."),
  bullet("Assets, announcements, and settings: keep operational records, requestor communications, and service desk configuration current."),
  pageBreak(),
  heading("Security and good practice"),
  bullet("Use a unique password of at least eight characters and do not share it. ICT-MIS staff will not ask you to disclose a password in a ticket."),
  bullet("Sign out on shared devices. Refresh tokens are protected in browser cookies; do not attempt to store authentication information elsewhere."),
  bullet("Only include information necessary to resolve the issue. Avoid posting sensitive data in public ticket replies or attachments."),
  bullet("Use public comments for requestor communication and internal notes for staff-only context."),
  heading("Troubleshooting"),
  bullet("Cannot sign in: verify the institutional email, password, and active account status. Try the configured NDMU Google sign-in option if applicable."),
  bullet("Cannot find a guest ticket: confirm the exact ticket number and tracking code from the acknowledgement."),
  bullet("No suitable category: choose Other MIS Assistance and describe the issue clearly."),
  bullet("Need faster assistance: include device, location, error text, impact, and the time the issue began; this helps ICT-MIS triage accurately."),
  paragraph("For urgent campus-wide outages or safety-related technology incidents, follow the university's established emergency escalation procedures in addition to creating a ticket.", { run: { bold: true, color: green } }),
];

const document = new Document({
  creator: "NDMU ICT-MIS",
  title: "NDMU ICT-MIS Service Desk User Manual",
  description: "User guide for the NDMU ICT-MIS Service Desk",
  numbering: {
    config: [{ reference: "steps", levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.LEFT }] }],
  },
  sections: [{
    properties: { page: { margin: { top: 900, right: 900, bottom: 900, left: 900 } } },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [text("NDMU ICT-MIS Service Desk User Manual | Page ", { size: 16, color: gray }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: gray })],
        })],
      }),
    },
    children,
  }],
});

fs.mkdirSync(manualDirectory, { recursive: true });
fs.writeFileSync(outputPath, await Packer.toBuffer(document));
console.log(`Created ${outputPath}`);
