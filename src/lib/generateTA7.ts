import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  HeadingLevel,
  AlignmentType,
  PageNumber,
  Footer,
  Header,
  VerticalAlign,
  Packer,
} from 'docx';

// ── Data interface ────────────────────────────────────────────────────────────

export interface TA7Data {
  address: string;
  pack_reference: string | null;
  tenure: string | null;
  // Step 1 — The Lease (from tenure_detail)
  lease_years_remaining: number | null;
  original_lease_term: number | null;
  lease_start_date: string | null;
  has_lease_extension: boolean | null;
  lease_extension_details: string | null;
  ground_rent_amount: number | null;
  ground_rent_review_period: string | null;
  ground_rent_review_basis: string | null;
  is_ground_rent_zero: boolean | null;
  // Step 2 — Service Charge & Management (from pdtf_data)
  service_charge_amount: number | null;
  service_charge_period: string | null;
  service_charge_review_date: string | null;
  managing_agent: string | null;
  managing_agent_contact: string | null;
  management_company_name: string | null;
  has_right_to_manage: boolean | null;
  has_service_charge_dispute: boolean | null;
  service_charge_dispute_details: string | null;
  // Step 3 — Building & Insurance
  building_insurance_by: string | null;
  building_insurance_provider: string | null;
  has_fire_safety_certificate: boolean | null;
  has_cladding: boolean | null;
  cladding_details: string | null;
  has_ews1: boolean | null;
  ews_rating: string | null;
  building_over_six_storeys: boolean | null;
  // Step 4 — Freeholder & Notices
  freeholder_name: string | null;
  freeholder_contact: string | null;
  has_share_of_freehold: boolean | null;
  has_section20_notice: boolean | null;
  section20_details: string | null;
  has_breach_of_lease: boolean | null;
  breach_details: string | null;
  has_pending_leasehold_claims: boolean | null;
  pending_claims_details: string | null;
  // Step 5 — Commonhold
  is_commonhold: boolean | null;
  commonhold_association_name: string | null;
  commonhold_annual_contribution: number | null;
  // Declaration
  confirms_leasehold_accuracy: boolean;
  signed_at: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TEAL_DARK = '0E7C7C';
const GREY_HEADER = 'D9E8E8';
const YELLOW_FLAG = 'FFFDE7';
const FONT = 'Calibri';
const FONT_SIZE = 22;

function val(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return iso;
  }
}

function heading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 120 },
    children: [new TextRun({ text, bold: true, color: TEAL_DARK, size: 28, font: FONT })],
  });
}

function para(text: string, bold = false): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text, bold, size: FONT_SIZE, font: FONT })],
  });
}

function divider(): Paragraph {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
    spacing: { before: 120, after: 120 },
    children: [],
  });
}

function headerCell(text: string): TableCell {
  return new TableCell({
    shading: { type: ShadingType.SOLID, color: GREY_HEADER },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: FONT_SIZE, font: FONT })], spacing: { after: 0 } })],
  });
}

function cell(text: string, highlight = false): TableCell {
  return new TableCell({
    shading: highlight ? { type: ShadingType.SOLID, color: YELLOW_FLAG } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ children: [new TextRun({ text, size: FONT_SIZE, font: FONT })], spacing: { after: 0 } })],
  });
}

function twoColTable(rows: Array<[string, string, boolean?]>): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [headerCell('Field'), headerCell('Value')] }),
      ...rows.map(([label, value, highlight]) =>
        new TableRow({ children: [cell(label), cell(value, highlight)] })
      ),
    ],
  });
}

// ── Document generator ────────────────────────────────────────────────────────

export async function generateTA7(data: TA7Data): Promise<Blob> {
  const now = new Date();
  const generatedOn = formatDate(now.toISOString());

  // ── Title section ─────────────────────────────────────────────────────────

  const titleSection = [
    new Paragraph({
      spacing: { before: 1440, after: 240 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Leasehold Information Form', bold: true, color: TEAL_DARK, size: 52, font: FONT })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: 'Based on TA7 (5th edition) — Law Society', size: FONT_SIZE, font: FONT, color: '888888', italics: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: data.address, size: 32, font: FONT, color: '444444' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 960 },
      children: [new TextRun({ text: `Generated ${generatedOn} · HomeSalesReady`, size: FONT_SIZE, font: FONT, color: '888888', italics: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: 'This document is pre-filled from data provided in your HomeSalesReady seller account. It is provided as a reference aid for your solicitor completing the official TA7 form. Always verify with your legal adviser before signing.',
          size: FONT_SIZE,
          font: FONT,
          color: '666666',
        }),
      ],
    }),
    divider(),
  ];

  // ── Section 1 — The Lease ─────────────────────────────────────────────────

  const s1 = [
    heading('1. The Lease'),
    twoColTable([
      ['Years remaining on lease', val(data.lease_years_remaining)],
      ['Original lease term (years)', val(data.original_lease_term)],
      ['Lease start date', formatDate(data.lease_start_date)],
      ['Lease extended', val(data.has_lease_extension)],
      ['Extension details', val(data.lease_extension_details)],
      ['Ground rent (£/year)', val(data.ground_rent_amount)],
      ['Ground rent currently zero (peppercorn)', val(data.is_ground_rent_zero)],
      ['Ground rent review period', val(data.ground_rent_review_period)],
      ['Ground rent review basis', val(data.ground_rent_review_basis)],
    ]),
    divider(),
  ];

  // ── Section 2 — Service Charge & Management ───────────────────────────────

  const s2 = [
    heading('2. Service Charge & Management'),
    twoColTable([
      ['Annual service charge (£)', val(data.service_charge_amount)],
      ['Payment frequency', val(data.service_charge_period)],
      ['Service charge review date', formatDate(data.service_charge_review_date)],
      ['Managing agent', val(data.managing_agent)],
      ['Managing agent contact', val(data.managing_agent_contact)],
      ['Management company', val(data.management_company_name)],
      ['Right to Manage company', val(data.has_right_to_manage)],
      ['Service charge disputes', val(data.has_service_charge_dispute)],
      ['Dispute details', val(data.service_charge_dispute_details)],
    ]),
    divider(),
  ];

  // ── Section 3 — Building & Insurance ─────────────────────────────────────

  const s3 = [
    heading('3. Building & Insurance'),
    twoColTable([
      ['Building insurance arranged by', val(data.building_insurance_by)],
      ['Insurance provider', val(data.building_insurance_provider)],
      ['Fire safety certificate', val(data.has_fire_safety_certificate)],
      ['Building six storeys or more', val(data.building_over_six_storeys)],
      ['Cladding present', val(data.has_cladding), data.has_cladding === true],
      ['Cladding details', val(data.cladding_details), data.has_cladding === true],
      ['EWS1 form', val(data.has_ews1)],
      ['EWS1 rating', val(data.ews_rating)],
    ]),
    divider(),
  ];

  // ── Section 4 — Freeholder & Notices ─────────────────────────────────────

  const s4 = [
    heading('4. Freeholder & Notices'),
    twoColTable([
      ['Freeholder name', val(data.freeholder_name)],
      ['Freeholder contact', val(data.freeholder_contact)],
      ['Share of freehold', val(data.has_share_of_freehold)],
      ['Section 20 notice (last 3 years)', val(data.has_section20_notice)],
      ['Section 20 details', val(data.section20_details)],
      ['Breach of lease notices', val(data.has_breach_of_lease)],
      ['Breach details', val(data.breach_details)],
      ['Pending tribunal claims', val(data.has_pending_leasehold_claims)],
      ['Claim details', val(data.pending_claims_details)],
    ]),
    divider(),
  ];

  // ── Section 5 — Commonhold ────────────────────────────────────────────────

  const s5Parts: (Paragraph | Table)[] = [heading('5. Commonhold')];

  if (data.is_commonhold === true) {
    s5Parts.push(
      twoColTable([
        ['Commonhold', val(data.is_commonhold)],
        ['Commonhold association name', val(data.commonhold_association_name)],
        ['Annual contribution (£)', val(data.commonhold_annual_contribution)],
      ])
    );
  } else {
    s5Parts.push(para('Not applicable — property is not commonhold.'));
  }

  s5Parts.push(divider());

  // ── Declaration ───────────────────────────────────────────────────────────

  const declaration = [
    heading('Declaration'),
    para('The seller confirms the leasehold information provided is accurate to the best of their knowledge.'),
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: 'Confirmed: ', bold: true, size: FONT_SIZE, font: FONT }),
        new TextRun({ text: data.confirms_leasehold_accuracy ? 'Yes' : 'Not yet confirmed', size: FONT_SIZE, font: FONT }),
      ],
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({ text: 'Date: ', bold: true, size: FONT_SIZE, font: FONT }),
        new TextRun({ text: formatDate(data.signed_at), size: FONT_SIZE, font: FONT }),
      ],
    }),
    divider(),
  ];

  // ── Footer note ───────────────────────────────────────────────────────────

  const footerNote = [
    new Paragraph({
      spacing: { before: 480 },
      children: [
        new TextRun({
          text: 'This document was automatically generated by HomeSalesReady and is for reference purposes only. It does not constitute legal advice and must be reviewed by a qualified solicitor before use in any property transaction.',
          size: 18,
          color: '888888',
          italics: true,
          font: FONT,
        }),
      ],
    }),
  ];

  // ── Assemble ──────────────────────────────────────────────────────────────

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: FONT, size: FONT_SIZE } },
      },
    },
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: `HomeSalesReady — Leasehold Information · ${data.address}`, size: 18, color: '888888', font: FONT })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Page ', size: 18, font: FONT, color: '888888' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18, font: FONT, color: '888888' }),
                  new TextRun({ text: ' of ', size: 18, font: FONT, color: '888888' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, font: FONT, color: '888888' }),
                ],
              }),
            ],
          }),
        },
        children: [
          ...titleSection,
          ...s1,
          ...s2,
          ...s3,
          ...s4,
          ...s5Parts,
          ...declaration,
          ...footerNote,
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}
