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

export interface OccupierRecord {
  occupier_type: string;
  will_vacate_on_completion: boolean | null;
  notes: string;
}

export interface AlterationRecord {
  alteration_type: string;
  description: string;
  year_completed: string;
  building_regs_obtained: string;
  planning_obtained: string;
  works_by_current_owner: boolean | null;
}

export interface GuaranteeRecord {
  guarantee_type: string;
  provider: string;
  start_date: string;
  expiry_date: string;
  transferable: string;
}

export interface TA6Data {
  // Property details
  address: string;
  property_type: string | null;
  tenure: string | null;
  // Step 1
  built_form: string | null;
  reception_count: number | null;
  tenure_detail: Record<string, unknown> | null;
  non_standard_construction: boolean | null;
  non_standard_construction_details: string | null;
  // Step 2
  occupiers: OccupierRecord[];
  // Step 3
  has_boundary_disputes: boolean | null;
  boundary_disputes: string | null;
  has_neighbour_disputes: boolean | null;
  neighbour_disputes: string | null;
  // Step 4
  has_chancel_repair: boolean | null;
  chancel_repair: string | null;
  has_planning_notices: boolean | null;
  // Step 5
  alterations: AlterationRecord[];
  // Step 6
  guarantees: GuaranteeRecord[];
  // Step 7
  heating_type: string | null;
  heating_age_years: number | null;
  sewerage: string | null;
  epc_expiry_date: string | null;
  // Step 8 (from pdtf_data)
  has_restrictions: boolean | null;
  has_easements: boolean | null;
  has_covenants: boolean | null;
  restriction_details: string | null;
  easement_details: string | null;
  covenant_details: string | null;
  has_shared_access: boolean | null;
  shared_access_details: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TEAL = '17AFAF';
const TEAL_DARK = '0E7C7C';
const GREY_HEADER = 'D9E8E8';
const FONT = 'Calibri';
const FONT_SIZE = 22; // half-points → 11pt

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
    children: [
      new TextRun({
        text,
        bold: true,
        color: TEAL_DARK,
        size: 28, // 14pt
        font: FONT,
      }),
    ],
  });
}

function para(text: string, bold = false): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text, bold, size: FONT_SIZE, font: FONT })],
  });
}

function labelValue(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: FONT_SIZE, font: FONT }),
      new TextRun({ text: value, size: FONT_SIZE, font: FONT }),
    ],
  });
}

function divider(): Paragraph {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' } },
    spacing: { before: 120, after: 120 },
    children: [],
  });
}

function tableHeaderCell(text: string): TableCell {
  return new TableCell({
    shading: { type: ShadingType.SOLID, color: GREY_HEADER },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: FONT_SIZE, font: FONT })],
        spacing: { after: 0 },
      }),
    ],
  });
}

function tableCell(text: string): TableCell {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        children: [new TextRun({ text, size: FONT_SIZE, font: FONT })],
        spacing: { after: 0 },
      }),
    ],
  });
}

function emptyTable(message: string): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [para(message)],
          }),
        ],
      }),
    ],
  });
}

// ── Document generator ────────────────────────────────────────────────────────

export async function generateTA6(data: TA6Data): Promise<Blob> {
  const now = new Date();
  const generatedOn = formatDate(now.toISOString());

  // ── Title page section ────────────────────────────────────────────────────

  const titleSection = [
    new Paragraph({
      spacing: { before: 1440, after: 240 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'Pre-filled TA6 Property Information',
          bold: true,
          color: TEAL_DARK,
          size: 52, // 26pt
          font: FONT,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: data.address,
          size: 32,
          font: FONT,
          color: '444444',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 960 },
      children: [
        new TextRun({
          text: `Generated ${generatedOn} · HomeSalesReady`,
          size: FONT_SIZE,
          font: FONT,
          color: '888888',
          italics: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: 'This document is pre-filled from data provided in your HomeSalesReady seller account. It is provided as a reference aid for your solicitor completing the official TA6 form. Always verify with your legal adviser before signing.',
          size: FONT_SIZE,
          font: FONT,
          color: '666666',
        }),
      ],
    }),
    divider(),
  ];

  // ── Section 1: Property & Tenure ─────────────────────────────────────────

  const s1: (Paragraph | Table)[] = [
    heading('1. Property & Tenure'),
    labelValue('Address', data.address),
    labelValue('Property type', val(data.property_type)),
    labelValue('Tenure', val(data.tenure)),
    labelValue('Built form', val(data.built_form)),
    labelValue('Number of reception rooms', val(data.reception_count)),
    labelValue('Non-standard construction', val(data.non_standard_construction)),
  ];

  if (data.non_standard_construction) {
    s1.push(labelValue('Construction details', val(data.non_standard_construction_details)));
  }

  if (data.tenure_detail && Object.keys(data.tenure_detail).length > 0) {
    s1.push(para('Tenure detail:', true));
    for (const [k, v] of Object.entries(data.tenure_detail)) {
      s1.push(labelValue(`  ${k}`, val(v as string)));
    }
  }

  s1.push(divider());

  // ── Section 2: Occupiers ──────────────────────────────────────────────────

  const s2: (Paragraph | Table)[] = [heading('2. Occupiers')];

  if (data.occupiers.length === 0) {
    s2.push(para('No occupiers recorded.'));
  } else {
    s2.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              tableHeaderCell('Occupier type'),
              tableHeaderCell('Will vacate on completion'),
              tableHeaderCell('Notes'),
            ],
          }),
          ...data.occupiers.map(
            (o) =>
              new TableRow({
                children: [
                  tableCell(val(o.occupier_type)),
                  tableCell(val(o.will_vacate_on_completion)),
                  tableCell(val(o.notes)),
                ],
              })
          ),
        ],
      })
    );
  }

  s2.push(divider());

  // ── Section 3: Boundaries ─────────────────────────────────────────────────

  const s3: (Paragraph | Table)[] = [
    heading('3. Boundaries'),
    labelValue('Boundary disputes', val(data.has_boundary_disputes)),
  ];

  if (data.has_boundary_disputes) {
    s3.push(labelValue('Details', val(data.boundary_disputes)));
  }

  s3.push(labelValue('Neighbour disputes', val(data.has_neighbour_disputes)));

  if (data.has_neighbour_disputes) {
    s3.push(labelValue('Details', val(data.neighbour_disputes)));
  }

  s3.push(divider());

  // ── Section 4: Disputes & Notices ─────────────────────────────────────────

  const s4: (Paragraph | Table)[] = [
    heading('4. Disputes & Notices'),
    labelValue('Chancel repair liability', val(data.has_chancel_repair)),
  ];

  if (data.has_chancel_repair) {
    s4.push(labelValue('Chancel repair details', val(data.chancel_repair)));
  }

  s4.push(labelValue('Planning notices received', val(data.has_planning_notices)));
  s4.push(divider());

  // ── Section 5: Alterations & Works ────────────────────────────────────────

  const s5: (Paragraph | Table)[] = [heading('5. Alterations & Works')];

  if (data.alterations.length === 0) {
    s5.push(para('No alterations recorded.'));
  } else {
    s5.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              tableHeaderCell('Type'),
              tableHeaderCell('Description'),
              tableHeaderCell('Year'),
              tableHeaderCell('Building regs'),
              tableHeaderCell('Planning'),
              tableHeaderCell('By current owner'),
            ],
          }),
          ...data.alterations.map(
            (a) =>
              new TableRow({
                children: [
                  tableCell(val(a.alteration_type)),
                  tableCell(val(a.description)),
                  tableCell(val(a.year_completed)),
                  tableCell(val(a.building_regs_obtained)),
                  tableCell(val(a.planning_obtained)),
                  tableCell(val(a.works_by_current_owner)),
                ],
              })
          ),
        ],
      })
    );
  }

  s5.push(divider());

  // ── Section 6: Guarantees & Warranties ────────────────────────────────────

  const s6: (Paragraph | Table)[] = [heading('6. Guarantees & Warranties')];

  if (data.guarantees.length === 0) {
    s6.push(para('No guarantees recorded.'));
  } else {
    s6.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              tableHeaderCell('Type'),
              tableHeaderCell('Provider'),
              tableHeaderCell('Start date'),
              tableHeaderCell('Expiry date'),
              tableHeaderCell('Transferable'),
            ],
          }),
          ...data.guarantees.map(
            (g) =>
              new TableRow({
                children: [
                  tableCell(val(g.guarantee_type)),
                  tableCell(val(g.provider)),
                  tableCell(formatDate(g.start_date)),
                  tableCell(formatDate(g.expiry_date)),
                  tableCell(val(g.transferable)),
                ],
              })
          ),
        ],
      })
    );
  }

  s6.push(divider());

  // ── Section 7: Services & Environmental ───────────────────────────────────

  const s7: (Paragraph | Table)[] = [
    heading('7. Services & Environmental'),
    labelValue('Heating type', val(data.heating_type)),
    labelValue('Heating system age (years)', val(data.heating_age_years)),
    labelValue('Sewerage', val(data.sewerage)),
    labelValue('EPC expiry date', formatDate(data.epc_expiry_date)),
    divider(),
  ];

  // ── Section 8: Restrictions & Rights ─────────────────────────────────────

  const s8: (Paragraph | Table)[] = [
    heading('8. Restrictions & Rights'),
    labelValue('Restrictions on title', val(data.has_restrictions)),
  ];

  if (data.has_restrictions) {
    s8.push(labelValue('Restriction details', val(data.restriction_details)));
  }

  s8.push(labelValue('Easements', val(data.has_easements)));

  if (data.has_easements) {
    s8.push(labelValue('Easement details', val(data.easement_details)));
  }

  s8.push(labelValue('Covenants', val(data.has_covenants)));

  if (data.has_covenants) {
    s8.push(labelValue('Covenant details', val(data.covenant_details)));
  }

  s8.push(labelValue('Shared access arrangements', val(data.has_shared_access)));

  if (data.has_shared_access) {
    s8.push(labelValue('Shared access details', val(data.shared_access_details)));
  }

  s8.push(divider());

  // ── Footer note ───────────────────────────────────────────────────────────

  const footerNote = [
    new Paragraph({
      spacing: { before: 480 },
      children: [
        new TextRun({
          text: 'This document was automatically generated by HomeSalesReady and is for reference purposes only. It does not constitute legal advice and must be reviewed by a qualified solicitor before use in any property transaction.',
          size: 18, // 9pt
          color: '888888',
          italics: true,
          font: FONT,
        }),
      ],
    }),
  ];

  // ── Assemble document ─────────────────────────────────────────────────────

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: FONT_SIZE },
        },
      },
    },
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `HomeSalesReady · ${data.address}`,
                    size: 18,
                    color: '888888',
                    font: FONT,
                  }),
                ],
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
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                    font: FONT,
                    color: '888888',
                  }),
                  new TextRun({ text: ' of ', size: 18, font: FONT, color: '888888' }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 18,
                    font: FONT,
                    color: '888888',
                  }),
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
          ...s5,
          ...s6,
          ...s7,
          ...s8,
          ...footerNote,
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}
