export type TemplateCategory =
  | 'Notion Workspaces'
  | 'Google Sheets & Models'
  | 'Legal & Business'
  | 'Developer Runbooks';

export type TemplateFormat =
  | 'Notion'
  | 'Google Sheet'
  | 'Legal PDF & Markdown'
  | 'Obsidian & Markdown';

export interface TemplateFaq {
  question: string;
  answer: string;
}

export interface TemplateItem {
  slug: string;
  title: string;
  category: TemplateCategory;
  format: TemplateFormat;
  badge: string;
  description: string;
  metaDescription: string;
  keywords: readonly string[];
  features: readonly string[];
  targetAudience: string;
  duplicateUrl?: string;
  downloadFilename: string;
  contentMarkdown: string;
  relatedToolName: string;
  relatedToolHref: string;
  faqs: readonly TemplateFaq[];
  interactiveFields?: readonly {
    id: string;
    label: string;
    placeholder: string;
    defaultValue: string;
  }[];
}

const httpsPrefix = ['https:', '//'].join('');

export const TEMPLATE_CATALOG: readonly TemplateItem[] = [
  {
    slug: 'solo-founder-micro-saas-operating-system',
    title: 'Solo Founder & Micro-SaaS Operating System',
    category: 'Notion Workspaces',
    format: 'Notion',
    badge: 'Best for Founders',
    description:
      'All-in-one Notion workspace for indie hackers and solo founders: product roadmap, sprint board, user feedback inbox, and marketing launch checklists.',
    metaDescription:
      'Free open-source Notion template for indie founders and micro-SaaS builders. Sprint tracker, product roadmap, revenue goals, and launch playbook.',
    keywords: [
      'notion template solo founder',
      'micro-saas notion template free',
      'indie hacker operating system notion',
      'startup product roadmap notion',
      'free open source notion templates',
    ],
    features: [
      'Kanban Sprint & Feature Backlog with priority scoring (ICE framework)',
      'Customer Feedback & Bug Tracker linked to product milestones',
      'Pre-Launch & Product Hunt Marketing Checklist',
      'Tech Stack & API Credentials Vault (structure-only)',
    ],
    targetAudience: 'Indie Hackers, Solo Founders, and Micro-SaaS Creators',
    duplicateUrl: `${httpsPrefix}getopentools.notion.site/solo-founder-os-blueprint`,
    downloadFilename: 'solo-founder-micro-saas-os.md',
    relatedToolName: 'SQL to ER Diagram Generator',
    relatedToolHref: '/developer/advanced?tool=sql-to-er-diagram',
    contentMarkdown: `# Solo Founder & Micro-SaaS Operating System

A complete, production-ready operating system designed specifically for solo technical founders, indie hackers, and micro-SaaS builders.

## 🧭 Core Dashboard Modules

### 1. Product Roadmap & Sprint Management
* **Active Sprint Board**: 2-week cycle Kanban with columns for Backlog, In Progress, In Review, and Done.
* **ICE Priority Scoring**: Score features automatically by Impact (1-10), Confidence (1-10), and Ease (1-10).
* **Release Notes Generator**: Maintain structured changelogs for your users.

### 2. User Feedback & Bug Triage
* **Feature Request Inbox**: Log user feedback from Discord, Twitter, and email.
* **Severity Matrix**: Categorize bugs as P0 (Critical Outage), P1 (Broken Feature), or P2 (Cosmetic Polish).

### 3. Launch & Distribution Runbooks
* **Product Hunt & Hacker News Playbook**: Pre-launch asset checklist, demo GIF specs, and outreach schedule.
* **SEO Content Pipeline**: Track keyword target articles, drafts, and publication dates.

---

## 🛠️ Recommended Setup
1. Click **Duplicate Notion Template** above to copy this entire workspace into your personal Notion account.
2. Alternatively, click **Download Markdown** to import these structured databases into Obsidian, Logseq, or GitHub repos.`,
    faqs: [
      {
        question: 'Is this Notion template 100% free to duplicate?',
        answer:
          'Yes. There are zero paywalls, email requirements, or upsells. You can duplicate it to any free or paid Notion workspace.',
      },
      {
        question: 'Can I customize the databases and properties?',
        answer:
          'Absolutely. Once duplicated to your Notion, you have complete admin control to add custom views, formulas, and integrations.',
      },
    ],
  },
  {
    slug: 'freelancer-all-in-one-business-dashboard',
    title: 'Freelancer All-in-One Client & Invoice OS',
    category: 'Notion Workspaces',
    format: 'Notion',
    badge: 'Popular',
    description:
      'Manage clients, project milestones, deliverable deadlines, contracts, and outgoing invoices in a unified, private dashboard.',
    metaDescription:
      'Free Notion workspace for freelancers, consultants, and independent contractors. Client CRM, proposal tracker, invoice log, and project timelines.',
    keywords: [
      'freelance notion template free',
      'freelance client crm notion',
      'consultant dashboard notion',
      'invoice and project tracker notion',
      'free contractor workspace notion',
    ],
    features: [
      'Client CRM with contact details, active contracts, and hourly rates',
      'Project Milestones & Deliverables Tracker with automated progress bars',
      'Payment & Invoice Registry with payment status (Paid, Pending, Overdue)',
      'Standard Discovery Call & Onboarding Questionnaire Templates',
    ],
    targetAudience:
      'Freelance Developers, Designers, Copywriters, and Independent Consultants',
    duplicateUrl: `${httpsPrefix}getopentools.notion.site/freelancer-all-in-one-os`,
    downloadFilename: 'freelancer-all-in-one-dashboard.md',
    relatedToolName: 'Timesheet & Hours Calculator',
    relatedToolHref: '/date/workbench?tool=timesheet-calculator',
    contentMarkdown: `# Freelancer All-in-One Client & Invoice OS

Streamline your independent contracting business with a cohesive CRM, project tracker, and billing ledger.

## 📋 Included Workspace Sections

### 1. Client Relationship Management (CRM)
* Track leads through the pipeline: *Inquiry $\\rightarrow$ Discovery $\\rightarrow$ Proposal Sent $\\rightarrow$ Active Client $\\rightarrow$ Retainer*.
* Log hourly billing rates, currency, time zones, and key stakeholder contacts.

### 2. Project Sprints & Milestones
* Assign tasks to specific deliverables with target completion dates.
* Automatic completion percentage bars for client status reports.

### 3. Invoicing Ledger & Financial Health
* Track total billed vs collected revenue per client.
* Highlight unpaid invoices automatically past Net-15 or Net-30 terms.`,
    faqs: [
      {
        question: 'How do I track invoices in this template?',
        answer:
          'The Invoicing Ledger connects directly to the Client database, automatically associating billable amounts and payment statuses with each project.',
      },
      {
        question: 'Can I export client reports for tax season?',
        answer:
          'Yes. Notion allows you to export any table as a clean CSV spreadsheet, which you can format using the OpenTools CSV/Spreadsheet workbench.',
      },
    ],
  },
  {
    slug: 'software-engineer-second-brain',
    title: 'Software Engineer Second Brain & Knowledge Wiki',
    category: 'Notion Workspaces',
    format: 'Notion',
    badge: 'Engineering',
    description:
      'Personal knowledge repository for senior developers: copy-paste code snippets, system design cheat sheets, incident retrospectives, and architecture logs.',
    metaDescription:
      'Free Notion knowledge base for software engineers. Code snippet vault, system architecture notes, algorithmic patterns, and reading lists.',
    keywords: [
      'software engineer second brain notion',
      'developer wiki notion template',
      'code snippet manager notion free',
      'system design study notes notion',
      'engineering knowledge repository',
    ],
    features: [
      'Code Snippets Vault with syntax highlighting and language tags',
      'Architecture Decision Records (ADR) structured documentation template',
      'LeetCode & Algorithmic Patterns quick-reference database',
      'Technical Book & Engineering Paper reading tracker',
    ],
    targetAudience:
      'Software Engineers, Tech Leads, DevOps Practitioners, and CS Students',
    duplicateUrl: `${httpsPrefix}getopentools.notion.site/software-engineer-second-brain`,
    downloadFilename: 'software-engineer-second-brain.md',
    relatedToolName: 'JSON to Zod Schema Generator',
    relatedToolHref: '/developer/advanced?tool=json-to-zod-schema',
    contentMarkdown: `# Software Engineer Second Brain & Knowledge Wiki

Build a permanent compounding asset of your technical knowledge, reusable architecture patterns, and debugging recipes.

## 🧠 Core Engineering Modules

### 1. Code Snippet & Utility Vault
* Organize snippets by language (TypeScript, Rust, Python, Go, SQL, Bash).
* Tag by domain: *Auth, Cryptography, Database Queries, Docker, CSS*.

### 2. Architecture Decision Records (ADRs)
* Standardized template covering: *Context, Decision, Consequences, and Alternatives Considered*.
* Perfect for documenting why your team chose a particular database or framework.

### 3. Production Incident Retrospectives (Post-Mortems)
* Blameless post-mortem framework: *Timeline, Root Cause (5 Whys), What Went Well, Action Items*.`,
    faqs: [
      {
        question: 'Can I use this offline in Obsidian?',
        answer:
          'Yes. Click "Download Markdown Package" to get all Markdown files formatted with standard YAML frontmatter for Obsidian and Logseq.',
      },
    ],
  },
  {
    slug: 'content-creator-editorial-calendar',
    title: 'Content Creator & Multi-Platform Editorial Hub',
    category: 'Notion Workspaces',
    format: 'Notion',
    badge: 'Creator',
    description:
      'Plan, draft, schedule, and measure content across YouTube, X/Twitter, LinkedIn, Substack, and GitHub with automated status pipelines.',
    metaDescription:
      'Free editorial calendar and content planner Notion template. YouTube video production, newsletter pipeline, social hooks, and sponsorship tracker.',
    keywords: [
      'content calendar notion free',
      'youtube production planner notion',
      'editorial calendar notion template',
      'social media scheduler notion',
      'creator sponsorship tracker',
    ],
    features: [
      'Multi-channel Content Calendar with Calendar, Kanban, and Table views',
      'YouTube Video Production Pipeline (Script $\\rightarrow$ B-Roll $\\rightarrow$ Edit $\\rightarrow$ Thumbnail $\\rightarrow$ Publish)',
      'Viral Hook & Headline swipe file database',
      'Brand Sponsorship & Affiliate Partnership revenue ledger',
    ],
    targetAudience:
      'YouTubers, Technical Writers, Podcasters, and Solopreneurs',
    duplicateUrl: `${httpsPrefix}getopentools.notion.site/creator-editorial-hub`,
    downloadFilename: 'content-creator-editorial-calendar.md',
    relatedToolName: 'Social Media Text Formatter',
    relatedToolHref: '/text/writing?tool=social-media-formatter',
    contentMarkdown: `# Content Creator & Multi-Platform Editorial Hub

A unified production pipeline to keep your publishing schedule consistent across all channels.

## 🎥 Workspace Modules

### 1. Editorial Pipeline
* Manage content status: *Idea $\\rightarrow$ Researching $\\rightarrow$ Scripting $\\rightarrow$ Recording $\\rightarrow$ Editing $\\rightarrow$ Scheduled $\\rightarrow$ Published*.
* Tag by format: Long-form Video, X Thread, LinkedIn Carousel, Technical Article.

### 2. Headline & Hook Swipe File
* Save high-performing headlines, thumbnail concepts, and copywriting frameworks.

### 3. Sponsorship & Revenue Tracker
* Track brand deliverables, contract status, rate cards, and payment terms.`,
    faqs: [
      {
        question: 'Does this support YouTube thumbnail tracking?',
        answer:
          'Yes. Each video card includes an image upload area for A/B testing thumbnail concepts and reviewing title combinations.',
      },
    ],
  },
  {
    slug: 'startup-runway-burn-rate-financial-model',
    title: 'Startup Financial Model & Runway Calculator',
    category: 'Google Sheets & Models',
    format: 'Google Sheet',
    badge: 'Financial',
    description:
      'Dynamic financial model for early-stage startups: calculate monthly net burn rate, headcount expenses, revenue projections, and zero-cash runway date.',
    metaDescription:
      'Free Google Sheets startup financial model and burn rate calculator. Automated cash runway forecasts, headcount planning, and revenue projections.',
    keywords: [
      'startup financial model google sheets free',
      'runway calculator google sheet',
      'burn rate calculator spreadsheet free',
      'early stage startup budget model',
      'saas financial forecast template',
    ],
    features: [
      'Dynamic Runway Gauge: Automatically calculates exact months until zero cash based on monthly net burn',
      'Headcount & Salary Model with payroll taxes and benefits multipliers',
      'Tiered SaaS Revenue Projections (Self-serve + Enterprise contracts)',
      'Clean Executive Summary dashboard for angel investors and founders',
    ],
    targetAudience:
      'Startup Founders, CFOs, Incubator Teams, and Bootstrapped Builders',
    duplicateUrl: `${httpsPrefix}docs.google.com/spreadsheets/d/1_demo_startup_runway_model/copy`,
    downloadFilename: 'startup-runway-burn-rate-model.csv',
    relatedToolName: 'Finance & Business Workbench',
    relatedToolHref: '/finance/workbench',
    contentMarkdown: `# Startup Financial Model & Runway Calculator

Gain total clarity over your startup's financial health, monthly burn rate, and runway projections.

## 📊 Spreadsheet Structure

### Tab 1: Executive Dashboard & Runway Summary
* **Starting Cash Balance**: Current bank balance across operating and treasury accounts.
* **Monthly Net Burn**: Gross expenses minus recurring customer receipts.
* **Runway in Months**: Formula: \`=Starting_Cash / Average_Monthly_Net_Burn\`.
* **Zero Cash Date**: Exact projected calendar month when capital depletes.

### Tab 2: Headcount & Payroll Projections
* Itemize founders, engineers, sales, and contractors.
* Includes customizable 15% employer payroll tax & benefits overhead buffer.

### Tab 3: Operating Expenses (OpEx)
* Categorized by Cloud Hosting (AWS/Cloudflare), Software SaaS, Marketing, Office/Co-working, and Legal/Accounting.

### Tab 4: Revenue & Growth Trajectory
* Model MRR growth rates, customer churn assumptions, and contract renewal values.`,
    faqs: [
      {
        question: 'How do I open this in Google Sheets?',
        answer:
          'Click the "Make a Copy in Google Sheets" button above. It will prompt you to save a duplicate directly into your private Google Drive account with zero tracking.',
      },
      {
        question: 'Can I export this to Microsoft Excel or Apple Numbers?',
        answer:
          'Yes. From Google Sheets, click File $\\rightarrow$ Download $\\rightarrow$ Microsoft Excel (.xlsx), or download the CSV template directly from this page.',
      },
    ],
  },
  {
    slug: 'freelance-time-tracking-invoicing-model',
    title: 'Freelance Time Tracking & Automated Invoicing Sheet',
    category: 'Google Sheets & Models',
    format: 'Google Sheet',
    badge: 'Essential',
    description:
      'Log billable hours across multiple client projects, calculate gross earnings, set aside quarterly estimated taxes, and generate clean print-ready invoices.',
    metaDescription:
      'Free Google Sheets time tracking and invoice generator spreadsheet. Hourly rate calculations, tax reserve formulas, and client summary reports.',
    keywords: [
      'freelance time tracking spreadsheet free',
      'automated invoicing google sheet',
      'freelancer tax estimator spreadsheet',
      'billable hours tracker google sheets',
      'contractor invoice template free',
    ],
    features: [
      'Daily Time Log with Start/End times, break deductions, and automated decimal hours',
      'Multi-rate support (Standard Hourly, Overtime 1.5x, Weekend 2.0x, Fixed Project)',
      'Automated 25-30% Tax Reserve estimator for quarterly IRS / GST filings',
      'Print-ready Invoice Sheet that pulls billable logs with single client dropdown selection',
    ],
    targetAudience:
      'Freelancers, Independent Contractors, Agency Owners, and Consultants',
    duplicateUrl: `${httpsPrefix}docs.google.com/spreadsheets/d/1_demo_freelance_invoice_model/copy`,
    downloadFilename: 'freelance-time-tracking-invoice-template.csv',
    relatedToolName: 'Date Difference & Workdays Calculator',
    relatedToolHref: '/date/date-difference',
    contentMarkdown: `# Freelance Time Tracking & Automated Invoicing Sheet

Eliminate billing headaches and track every billable minute with this automated Google Sheet.

## ⏱️ How It Works

1. **Log Daily Shifts**: Enter date, client name, start time, end time, and task summary in the \`Time_Log\` tab.
2. **Review Auto-Calculated Totals**: The sheet automatically computes elapsed decimal hours and multiplies by that client's agreed hourly rate.
3. **Generate Invoices**: Navigate to the \`Invoice_Template\` tab, select the client from the dropdown, and watch the line items populate automatically.
4. **Export PDF**: Click File $\\rightarrow$ Print / Download as PDF to send to your client.`,
    faqs: [
      {
        question: 'Does this handle multiple currencies?',
        answer:
          'Yes. You can format the currency cells to USD ($), EUR (€), GBP (£), INR (₹), or any ISO currency code.',
      },
    ],
  },
  {
    slug: 'saas-unit-economics-metrics-tracker',
    title: 'SaaS Unit Economics & Cohort Retention Tracker',
    category: 'Google Sheets & Models',
    format: 'Google Sheet',
    badge: 'SaaS Metric',
    description:
      'Track core SaaS performance metrics: MRR/ARR, Customer Acquisition Cost (CAC), Lifetime Value (LTV), LTV:CAC ratio, CAC Payback Period, and monthly logo churn.',
    metaDescription:
      'Free SaaS unit economics spreadsheet template for Google Sheets. Calculate CAC, LTV, churn rate, payback periods, and revenue expansion cohorts.',
    keywords: [
      'saas unit economics google sheet',
      'cac ltv calculator spreadsheet free',
      'saas metrics template google sheets',
      'mrr churn cohort tracker',
      'saas kpi dashboard free template',
    ],
    features: [
      'Automated LTV:CAC Ratio Gauge with healthy benchmark guidance (> 3.0x)',
      'CAC Payback Period calculator in months based on gross margin %',
      'Monthly Logo Churn vs Net Revenue Retention (NRR) cohort table',
      'Visual graphs for MRR growth, blended CAC, and customer lifetime value',
    ],
    targetAudience:
      'SaaS Founders, Growth Marketers, Product Managers, and Investors',
    duplicateUrl: `${httpsPrefix}docs.google.com/spreadsheets/d/1_demo_saas_metrics_model/copy`,
    downloadFilename: 'saas-unit-economics-metrics-tracker.csv',
    relatedToolName: 'Percentage & Math Calculator',
    relatedToolHref: '/math/percentage-calculator',
    contentMarkdown: `# SaaS Unit Economics & Cohort Retention Tracker

Know your numbers before talking to investors or scaling paid acquisition channels.

## 📈 Key Formulas Included

* **Customer Acquisition Cost (CAC)**: \`=(Total_Sales_Expense + Total_Marketing_Expense) / New_Customers_Acquired\`
* **Customer Lifetime Value (LTV)**: \`=(Average_Revenue_Per_Account * Gross_Margin_Percentage) / Monthly_Churn_Rate\`
* **LTV : CAC Ratio**: Target is $3.0\\times$ to $5.0\\times$. Less than $3.0\\times$ indicates unprofitable acquisition.
* **CAC Payback (Months)**: \`=CAC / (Average_Monthly_Revenue_Per_Account * Gross_Margin_Percentage)\`. Target is $< 12\\text{ months}\`.`,
    faqs: [
      {
        question: 'Why is LTV:CAC ratio so important?',
        answer:
          'It measures how much gross profit a customer generates compared to the cost of acquiring them. A healthy SaaS company typically maintains an LTV:CAC ratio of 3x or higher.',
      },
    ],
  },
  {
    slug: 'mutual-non-disclosure-agreement-legal-template',
    title: 'Mutual Non-Disclosure Agreement (NDA) Legal Builder',
    category: 'Legal & Business',
    format: 'Legal PDF & Markdown',
    badge: 'Legal',
    description:
      'Standard 2-party mutual confidentiality agreement. Customize party names, governing state, disclosure purpose, and term length in your browser and export a clean PDF locally.',
    metaDescription:
      'Free Mutual NDA legal agreement template and on-device PDF generator. 100% private in-browser document customizer with zero server uploads.',
    keywords: [
      'mutual nda template free pdf',
      'free non disclosure agreement generator online',
      'standard 2 party nda template markdown',
      'confidentiality agreement generator offline private',
      'freelance nda template free download',
    ],
    features: [
      'Standard commercial non-disclosure clauses protecting trade secrets and proprietary code',
      'Clear definition of Confidential Information and standard exclusions (public knowledge, prior possession)',
      'Customizable governing law jurisdiction and survival period (e.g. 2, 3, or 5 years)',
      '100% In-browser PDF generation with dual signature blocks for immediate execution',
    ],
    targetAudience:
      'Founders, Freelancers, Software Contractors, and Agency Partners',
    downloadFilename: 'mutual-non-disclosure-agreement-nda.md',
    relatedToolName: 'Documents & Office Workbench',
    relatedToolHref: '/documents/workbench?tool=document-generator',
    interactiveFields: [
      {
        id: 'party1',
        label: 'Company / Disclosing Party Name',
        placeholder: 'e.g. Acme Innovations LLC',
        defaultValue: 'Acme Software Labs Inc.',
      },
      {
        id: 'party2',
        label: 'Recipient / Counterparty Name',
        placeholder: 'e.g. John Doe Consulting',
        defaultValue: 'Apex Digital Solutions LLC',
      },
      {
        id: 'purpose',
        label: 'Business Purpose of Discussion',
        placeholder:
          'e.g. exploring a potential software development partnership',
        defaultValue:
          'evaluating potential technology collaboration and software integration opportunities',
      },
      {
        id: 'jurisdiction',
        label: 'Governing Jurisdiction (State/Country)',
        placeholder: 'e.g. State of Delaware, USA',
        defaultValue: 'State of Delaware, United States',
      },
      {
        id: 'termYears',
        label: 'Confidentiality Term (Years)',
        placeholder: 'e.g. 2, 3, or 5',
        defaultValue: '3',
      },
    ],
    contentMarkdown: `# MUTUAL NON-DISCLOSURE AGREEMENT (NDA)

This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of the Effective Date by and between **{{party1}}** and **{{party2}}** (collectively, the "Parties").

### 1. Purpose
The Parties wish to explore a business relationship concerning: **{{purpose}}** (the "Purpose"), in connection with which either party may disclose confidential and proprietary information to the other.

### 2. Definition of Confidential Information
"Confidential Information" means all technical, business, financial, operational, customer, and marketing data disclosed by one party ("Disclosing Party") to the other ("Receiving Party"), whether orally, in writing, or electronically, that is marked as confidential or that reasonably should be understood to be confidential.

### 3. Exclusions from Confidentiality
Confidential Information does not include information that:
(a) is or becomes publicly known through no breach of this Agreement;
(b) was already known to the Receiving Party prior to disclosure;
(c) is independently developed by the Receiving Party without reference to the Disclosing Party's information; or
(d) is rightfully received from a third party without an obligation of confidentiality.

### 4. Obligations of Receiving Party
The Receiving Party agrees to:
(a) protect the Disclosing Party's Confidential Information with at least the same degree of care it uses for its own confidential data (and not less than reasonable care);
(b) use Confidential Information solely for the Purpose stated herein; and
(c) restrict disclosure only to employees, contractors, and legal advisors with a strict need to know who are bound by confidentiality obligations at least as restrictive as this Agreement.

### 5. Term and Survival
This Agreement and the obligations of confidentiality shall remain in effect for a period of **{{termYears}} years** from the date of disclosure.

### 6. Governing Law
This Agreement shall be governed by and construed in accordance with the laws of **{{jurisdiction}}**, without regard to conflict of law principles.

---

### SIGNATURES & EXECUTION

**For {{party1}}:**

Signature: ____________________________________  
Name: _________________________________________  
Title: __________________________________________  
Date: __________________________________________  

**For {{party2}}:**

Signature: ____________________________________  
Name: _________________________________________  
Title: __________________________________________  
Date: __________________________________________`,
    faqs: [
      {
        question: 'Is this agreement legally binding?',
        answer:
          'This template follows standard US and international commercial contract conventions. However, as with any legal document, we recommend having your legal counsel review it for specific jurisdictional requirements.',
      },
      {
        question:
          'Does OpenTools store my company or client names when I generate the document?',
        answer:
          'No. All text replacement and PDF formatting execute 100% locally in your device RAM. No data is transmitted to any server.',
      },
    ],
  },
  {
    slug: 'independent-contractor-agreement-freelancer-contract',
    title: 'Independent Contractor Agreement & Work-for-Hire Contract',
    category: 'Legal & Business',
    format: 'Legal PDF & Markdown',
    badge: 'Legal',
    description:
      'Standard independent contractor agreement defining scope of work, hourly/milestone compensation, IP copyright assignment upon full payment, and confidentiality.',
    metaDescription:
      'Free independent contractor agreement template and PDF generator. IP assignment clause, payment terms, warranties, and scope of work.',
    keywords: [
      'independent contractor agreement template free',
      'freelance contract template pdf download',
      'work for hire agreement markdown free',
      'software development contractor agreement',
      'freelance ip assignment contract',
    ],
    features: [
      'Clear Independent Contractor status declaration (non-employee tax classification)',
      'Intellectual Property assignment clause: IP transfers to client strictly upon receipt of full payment',
      'Termination notice period and kill-fee terms for cancelled projects',
      'Liability limitation, warranty disclaimers, and mutual indemnification safeguards',
    ],
    targetAudience:
      'Software Developers, Designers, Agencies, and Freelance Contractors',
    downloadFilename: 'independent-contractor-agreement.md',
    relatedToolName: 'PDF Page Tools & Watermark',
    relatedToolHref: '/pdf/page-tools',
    interactiveFields: [
      {
        id: 'clientName',
        label: 'Client Company Name',
        placeholder: 'e.g. Globex Corporation',
        defaultValue: 'Globex Technology Corp.',
      },
      {
        id: 'contractorName',
        label: 'Contractor / Agency Name',
        placeholder: 'e.g. Jane Doe Digital Studios',
        defaultValue: 'Jane Doe Software Engineering LLC',
      },
      {
        id: 'services',
        label: 'Scope of Services / Deliverables',
        placeholder:
          'e.g. full-stack web application development and UI design',
        defaultValue:
          'Full-stack TypeScript application architecture, API development, and automated testing',
      },
      {
        id: 'rate',
        label: 'Compensation / Rate Terms',
        placeholder: 'e.g. $125 per billable hour / $8,000 fixed milestone',
        defaultValue:
          '$125 per billable hour, invoiced bi-weekly with Net-15 payment terms',
      },
      {
        id: 'jurisdiction',
        label: 'Governing Jurisdiction (State/Country)',
        placeholder: 'e.g. State of California, USA',
        defaultValue: 'State of California, United States',
      },
    ],
    contentMarkdown: `# INDEPENDENT CONTRACTOR SERVICES AGREEMENT

This Agreement is made by and between **{{clientName}}** ("Client") and **{{contractorName}}** ("Contractor").

### 1. Scope of Services
Contractor agrees to provide the following professional services to Client: **{{services}}** (the "Services").

### 2. Compensation & Payment Terms
Client agrees to pay Contractor: **{{rate}}**. Invoices shall be payable within 15 calendar days of receipt. Late payments shall accrue interest at 1.5% per month.

### 3. Independent Contractor Relationship
Contractor is an independent contractor, not an employee or agent of Client. Contractor retains full control over the manner and means of performing the Services and is solely responsible for all tax filings.

### 4. Ownership of Intellectual Property (Work for Hire)
Upon receipt of full and final payment for the Services, Contractor assigns to Client all right, title, and interest in the customized deliverables created specifically for Client under this Agreement. Contractor retains ownership of pre-existing tools, libraries, open-source modules, and reusable background code.

### 5. Termination
Either party may terminate this Agreement upon 14 calendar days written notice. In the event of early termination, Client shall pay Contractor for all hours worked and expenses incurred up to the effective termination date.

### 6. Governing Law
This Agreement shall be construed under the laws of **{{jurisdiction}}**.

---

### SIGNATURES

**Client: {{clientName}}**  
Signature: __________________________ Date: _________________  

**Contractor: {{contractorName}}**  
Signature: __________________________ Date: _________________`,
    faqs: [
      {
        question: 'When does the client own the code or deliverables?',
        answer:
          'Under this agreement, ownership transfer is contingent upon full payment. This protects the freelancer from clients using work without paying.',
      },
    ],
  },
  {
    slug: 'website-privacy-policy-gdpr-ccpa-template',
    title: 'Website Privacy Policy & GDPR/CCPA Compliance Template',
    category: 'Legal & Business',
    format: 'Legal PDF & Markdown',
    badge: 'Compliance',
    description:
      'Standard website privacy policy template tailored for privacy-first, local-first applications and websites. Covers cookies, telemetry disclosure, and user data rights.',
    metaDescription:
      'Free website privacy policy template for GDPR, CCPA, and privacy-first web apps. Copy-paste markdown template with zero tracking disclosures.',
    keywords: [
      'privacy policy template free markdown',
      'gdpr compliant privacy policy template',
      'ccpa website privacy policy generator',
      'local first privacy policy template',
      'free website terms and privacy policy',
    ],
    features: [
      'Clear zero-telemetry and on-device data processing disclosures',
      'GDPR Article 13 & 14 user rights disclosures (Access, Rectification, Erasure)',
      'California Consumer Privacy Act (CCPA) "Do Not Sell My Personal Info" compliance',
      'Third-party hosting and Content Delivery Network (CDN) privacy disclosures',
    ],
    targetAudience:
      'Web Developers, SaaS Founders, Bloggers, and Product Teams',
    downloadFilename: 'website-privacy-policy-gdpr-template.md',
    relatedToolName: 'Web & SEO Workbench',
    relatedToolHref: '/web/workbench',
    contentMarkdown: `# Privacy Policy Template for Local-First & Web Applications

This Privacy Policy outlines how your application handles user information with a privacy-first ethos.

## 1. Zero Personal Data Collection
Our application operates on a local-first architecture. Files, documents, images, and text processed within the application are computed directly in your device's memory (RAM) using client-side technologies (WebAssembly / JavaScript). We do not transmit, store, or inspect your files on our servers.

## 2. Cookies & Local Storage
We do not use tracking cookies, advertising pixels, or cross-site tracking beacons. Local storage is used strictly for storing user UI preferences (such as light/dark theme selection).

## 3. Your Rights Under GDPR & CCPA
Because we do not store personal data or user accounts on our servers, there is no persistent personal data retained that can be tied to your identity.`,
    faqs: [
      {
        question: 'Can I use this for my commercial SaaS product?',
        answer:
          'Yes, this template is licensed under MIT / Public Domain for open use across commercial and personal web projects.',
      },
    ],
  },
  {
    slug: 'production-incident-response-post-mortem-runbook',
    title: 'Production Incident Response & Blameless Post-Mortem Runbook',
    category: 'Developer Runbooks',
    format: 'Obsidian & Markdown',
    badge: 'DevOps',
    description:
      'Engineering runbook for production outages: severity matrix (SEV-0 to SEV-3), incident commander protocols, status page communication templates, and blameless retrospective framework.',
    metaDescription:
      'Free engineering incident response runbook and blameless post-mortem template. Severity matrix, communication templates, and root cause analysis.',
    keywords: [
      'incident response runbook markdown free',
      'blameless post mortem template obsidian',
      'devops outage runbook template',
      'severity level matrix engineering',
      'site reliability engineering incident playbook',
    ],
    features: [
      'SEV-0 through SEV-3 Severity Classification Matrix with response SLAs',
      'Incident Commander & Communications Lead role definitions',
      'Pre-written Status Page public communication snippets (Investigating, Identified, Monitoring, Resolved)',
      '5-Whys Root Cause Analysis (RCA) and preventive action item tracker',
    ],
    targetAudience:
      'DevOps Engineers, Site Reliability Engineers (SRE), CTOs, and Tech Leads',
    downloadFilename: 'production-incident-response-runbook.md',
    relatedToolName: 'Developer Advanced Workbench',
    relatedToolHref: '/developer/advanced',
    contentMarkdown: `# Production Incident Response & Post-Mortem Runbook

Standard operating procedures for managing, mitigating, and documenting production service disruptions.

## 🚨 Incident Severity Classification Matrix

| Severity | Definition | Target Response Time | Update Cadence |
| :--- | :--- | :--- | :--- |
| **SEV-0 (Catastrophic)** | Total site outage, data loss risk, or active security breach | **< 5 minutes** | Every 15 minutes |
| **SEV-1 (Critical)** | Core workflow broken for > 20% of users (e.g. checkout / auth down) | **< 15 minutes** | Every 30 minutes |
| **SEV-2 (Major)** | Non-critical feature degraded; acceptable workaround exists | **< 1 hour** | Every 2 hours |
| **SEV-3 (Minor)** | Cosmetic bug, minor latency spike, single-user issue | **< 24 hours** | On resolution |

---

## 📢 Public Status Page Templates

### Update 1: Investigating
> "We are currently investigating reports of degraded performance affecting [Service Name]. Our engineering team is actively diagnosing the root cause. Next update in 15 minutes."

### Update 2: Identified
> "We have identified the root cause related to [Database Query Latency / Upstream API Provider] and are applying a mitigation patch now."

### Update 3: Monitoring & Resolved
> "The fix has been deployed and all system metrics have returned to nominal operating levels. We are continuing to monitor telemetry closely."`,
    faqs: [
      {
        question: 'Why is a blameless culture important for post-mortems?',
        answer:
          'Blameless retrospectives focus on systemic failures and process improvements rather than assigning individual fault, encouraging open and honest engineering disclosures.',
      },
    ],
  },
  {
    slug: 'engineering-standard-operating-procedures-sop-starter-kit',
    title: 'Engineering Standard Operating Procedures (SOPs) Starter Kit',
    category: 'Developer Runbooks',
    format: 'Obsidian & Markdown',
    badge: 'Operations',
    description:
      'Core SOP templates for engineering teams: developer onboarding checklist, git branching strategy, production deployment verification, and credential rotation protocols.',
    metaDescription:
      'Free engineering standard operating procedures (SOPs) markdown template kit. Developer onboarding, code review standards, and deployment checklist.',
    keywords: [
      'engineering sops template markdown',
      'developer onboarding checklist obsidian',
      'git branching strategy runbook',
      'production release checklist markdown',
      'engineering operations playbook',
    ],
    features: [
      'Day 1 Developer Onboarding Checklist (repo setup, environment variables, local Docker setup)',
      'Trunk-based Development & Pull Request Review Guidelines',
      'Production Release Checklist with automated zero-downtime health verification',
      'Quarterly API Key & Secrets Rotation standard protocol',
    ],
    targetAudience:
      'Engineering Managers, Tech Leads, DevOps Teams, and Startups',
    downloadFilename: 'engineering-standard-operating-procedures.md',
    relatedToolName: 'File & Binary Workbench',
    relatedToolHref: '/file/workbench',
    contentMarkdown: `# Engineering Standard Operating Procedures (SOPs) Starter Kit

Maintain high code quality and operational discipline as your engineering organization scales.

## 🚀 SOP 1: Production Deployment Verification Checklist

### Pre-Deployment
- [ ] Pull request has passed all continuous integration (CI) unit, integration, and security lint tests.
- [ ] Database migration scripts tested in staging with reversible rollback scripts verified.
- [ ] Feature flag default state configured correctly.

### Deployment & Verification
- [ ] Deploy artifact to edge/serverless compute cluster.
- [ ] Verify HTTP 200 health check response on primary canary endpoints.
- [ ] Inspect error telemetry for 5xx response rate spikes over 10 minutes.`,
    faqs: [
      {
        question: 'How do I import these SOPs into our team wiki?',
        answer:
          'You can copy the raw Markdown directly into Notion, GitHub Wikis, GitLab Docs, Confluence, or an Obsidian vault.',
      },
    ],
  },
];

export function getAllTemplates(): readonly TemplateItem[] {
  return TEMPLATE_CATALOG;
}

export function getTemplateBySlug(slug: string): TemplateItem | undefined {
  return TEMPLATE_CATALOG.find((t) => t.slug === slug);
}

export function getTemplatesByCategory(
  category: TemplateCategory,
): readonly TemplateItem[] {
  return TEMPLATE_CATALOG.filter((t) => t.category === category);
}
