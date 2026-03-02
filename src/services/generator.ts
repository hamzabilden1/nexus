import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableCell, TableRow, WidthType, ShadingType, IStylesOptions } from 'docx';
import * as xlsx from 'xlsx';
import { marked } from 'marked';

type PdfContentBlock = { type: 'text'; content: string } | { type: 'image'; content: string };


const docxStyles: IStylesOptions = {
  default: {
    document: {
      run: {
        font: "Calibri",
        size: 22, // 11pt
      },
    },
  },
  paragraphStyles: [
    {
      id: "Heading1",
      name: "Heading 1",
      basedOn: "Normal",
      next: "Normal",
      quickFormat: true,
      run: { size: 32, bold: true },
      paragraph: { spacing: { before: 240, after: 120 } },
    },
    {
      id: "Heading2",
      name: "Heading 2",
      basedOn: "Normal",
      next: "Normal",
      quickFormat: true,
      run: { size: 26, bold: true },
      paragraph: { spacing: { before: 180, after: 100 } },
    },
    {
      id: "code",
      name: "Code",
      basedOn: "Normal",
      run: { font: "Courier New", size: 20 },
      paragraph: {
        shading: {
          type: ShadingType.CLEAR,
          fill: "F1F1F1",
        },
      }
    }
  ]
};

async function markdownToDocxChildren(markdown: string): Promise<any[]> {
    const tokens = marked.lexer(markdown);
    const children: any[] = [];

    for (const token of tokens) {
        switch (token.type) {
            case 'heading':
                children.push(new Paragraph({
                    text: token.text,
                    heading: `Heading${token.depth}` as any,
                    spacing: { before: 200, after: 100 },
                }));
                break;
            case 'paragraph':
                const textRuns = (token.tokens || []).map((t: any) => {
                    return new TextRun({
                        text: t.text || '',
                        bold: t.type === 'strong',
                        italics: t.type === 'em',
                        font: t.type === 'codespan' ? 'Courier New' : undefined
                    });
                });
                children.push(new Paragraph({ children: textRuns, spacing: { after: 120 } }));
                break;
            case 'list':
                for (const item of token.items) {
                    children.push(new Paragraph({ text: (item as any).text, bullet: { level: 0 } }));
                }
                children.push(new Paragraph("")); // Add space after list
                break;
            case 'code':
                children.push(new Paragraph({ text: token.text, style: 'code' }));
                break;
            case 'table':
                 const header = new TableRow({
                    children: token.header.map((cell: any) => new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: cell.text, bold: true })] })],
                        shading: { fill: "EAEAEA", type: ShadingType.CLEAR },
                    })),
                });
                const bodyRows = token.rows.map((row: any) => new TableRow({
                    children: row.map((cell: any) => new TableCell({ children: [new Paragraph(cell.text)] })),
                }));
                children.push(new Table({
                    rows: [header, ...bodyRows],
                    width: { size: 100, type: WidthType.PERCENTAGE },
                }));
                break;
            case 'space':
                children.push(new Paragraph(""));
                break;
        }
    }
    return children;
}

export class FileGenerator {
  private outputDir: string;

  constructor(outputDir: string = '../data/generated') {
    this.outputDir = path.join(__dirname, outputDir);
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  private getFilePath(filename: string): string {
    return path.join(this.outputDir, filename);
  }

  async createPDF(content: string, filename: string = 'output.pdf', imagePath?: string): Promise<string> {
      const filePath = this.getFilePath(filename);
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      const tokens = marked.lexer(content);
      for (const token of tokens) {
          if(token.type === 'heading') doc.fontSize(16 + (3-token.depth)*2).font('Helvetica-Bold').text(token.text).moveDown(0.5);
          else if(token.type === 'paragraph') doc.fontSize(11).font('Helvetica').text(token.text, {align: 'justify'}).moveDown(0.5);
          else if(token.type === 'list') (token as any).items.forEach((item: any) => doc.fontSize(11).font('Helvetica').text(`• ${item.text}`).moveDown(0.2));
          else if(token.type === 'code') doc.fontSize(10).font('Courier').text(token.text).moveDown(1);
          else if(token.type === 'space') doc.moveDown(0.5);
      }

      if (imagePath && fs.existsSync(imagePath)) {
        doc.addPage();
        doc.image(imagePath, {
          fit: [doc.page.width - 100, doc.page.height - 100],
          align: 'center',
          valign: 'center'
        });
      }

      doc.end();
      return new Promise(resolve => stream.on('finish', () => resolve(filePath)));
  }

  async createMultiPartPDF(blocks: PdfContentBlock[], filename: string): Promise<string> {
    const filePath = this.getFilePath(filename);
    const doc = new PDFDocument({ margin: 50, autoFirstPage: false });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    if (blocks.length > 0) {
        doc.addPage();
    }

    for (const block of blocks) {
      if (block.type === 'text') {
        const tokens = marked.lexer(block.content);
        for (const token of tokens) {
            const isTooCloseToBottom = (y: number) => y > doc.page.height - doc.page.margins.bottom;
            if(token.type === 'heading') {
                if (isTooCloseToBottom(doc.y + 20)) doc.addPage();
                doc.fontSize(16 + (3-token.depth)*2).font('Helvetica-Bold').text(token.text).moveDown(0.5);
            }
            else if(token.type === 'paragraph') {
                const height = doc.heightOfString(token.text, { width: doc.page.width - 100 });
                if (isTooCloseToBottom(doc.y + height)) doc.addPage();
                doc.fontSize(11).font('Helvetica').text(token.text, {align: 'justify'}).moveDown(0.5);
            }
        }
      } else if (block.type === 'image' && fs.existsSync(block.content)) {
        if (doc.y > doc.page.margins.top) { // If not a fresh page, add one
            doc.addPage();
        }
        doc.image(block.content, {
          fit: [doc.page.width - 100, doc.page.height - 100],
          align: 'center',
          valign: 'center'
        });
      }
      doc.moveDown();
    }

    doc.end();
    return new Promise(resolve => stream.on('finish', () => resolve(filePath)));
  }

  async createDOCX(content: string, filename: string = 'output.docx'): Promise<string> {
    const filePath = this.getFilePath(filename);
    const children = await markdownToDocxChildren(content);
    const doc = new Document({ styles: docxStyles, sections: [{ children }] });
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(filePath, buffer);
    return filePath;
  }

  async createExcel(content: string, filename: string = 'output.xlsx'): Promise<string> {
    const filePath = this.getFilePath(filename);
    const tokens = marked.lexer(content);
    const tableToken = tokens.find(t => t.type === 'table') as any;

    let data: any[][];

    if (tableToken) {
      data = [
        tableToken.header.map((h: any) => h.text),
        ...tableToken.rows.map((row: any) => row.map((cell: any) => cell.text))
      ];
    } else {
      data = content.split('\n').map(line => [line]);
    }

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.aoa_to_sheet(data);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Rapor');
    xlsx.writeFile(workbook, filePath);
    return filePath;
  }

  async createText(content: string, filename: string = 'output.txt'): Promise<string> {
    const filePath = this.getFilePath(filename);
    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
  }
}

export const fileGenerator = new FileGenerator();
