import * as fabric from "fabric";
import { createFrameTextControls } from "$/fabric-object/textbox-controls";

interface UniqueTextboxExtProps {
  fontAutoSize: boolean;
  minHeight: number;
}

const TEXTBOX_PROPS: Array<keyof UniqueTextboxExtProps> = ["fontAutoSize", "minHeight"];

export const textboxExtDefaultValues: Partial<fabric.TClassProperties<TextboxExt>> = {
  fontAutoSize: false,
  minHeight: 0,
  lockScalingX: false,
  lockScalingY: false,
};

export interface TextboxExtProps extends fabric.TextboxProps, UniqueTextboxExtProps {}
export interface SerializedTextboxExtProps extends fabric.SerializedTextboxProps, UniqueTextboxExtProps {}

export class TextboxExt<
    Props extends fabric.TOptions<TextboxExtProps> = Partial<TextboxExtProps>,
    SProps extends SerializedTextboxExtProps = SerializedTextboxExtProps,
    EventSpec extends fabric.ITextEvents = fabric.ITextEvents,
  >
  extends fabric.Textbox<Props, SProps, EventSpec>
  implements UniqueTextboxExtProps
{
  declare fontAutoSize: boolean;
  declare minHeight: number;

  private widthBeforeEditing?: number;

  static override createControls() {
    return { controls: createFrameTextControls() };
  }

  constructor(text: string, options?: Props) {
    super(text, options);
    Object.assign(this, textboxExtDefaultValues);
    this.setOptions(options);
  }

  /** Set text and reduce fontSize until text fits to the given width */
  setAndShrinkText(text: string, maxWidth: number, maxLines?: number) {
    const linesLimit = maxLines ?? this._splitTextIntoLines(this.text).lines.length;

    let linesCount = this._splitTextIntoLines(text).lines.length;

    this.set({ text });

    while ((linesCount > linesLimit || this.width > maxWidth) && this.fontSize > 2) {
      this.fontSize -= 1;
      this.set({ text, width: maxWidth });
      linesCount = this._splitTextIntoLines(text).lines.length;
    }
  }

  /** Reduce fontSize until text fits to the given width */
  shrinkText(maxWidth: number, maxLines: number) {
    let linesCount = this._splitTextIntoLines(this.text).lines.length;

    while ((linesCount > maxLines || this.width > maxWidth) && this.fontSize > 2) {
      this.fontSize -= 1;
      this.set({ width: maxWidth });
      linesCount = this._splitTextIntoLines(this.text).lines.length;
    }
  }

  override initDimensions() {
    const frameWidth = this.width;
    super.initDimensions();
    this.width = frameWidth;
    if (this.minHeight > 0) {
      this.height = Math.max(this.height, this.minHeight);
    }
  }

  override _wrapLine(
    lineIndex: number,
    desiredWidth: number,
    { wordsData }: fabric.GraphemeData,
    reservedSpace = 0,
  ): string[][] {
    const additionalSpace = this._getWidthOfCharSpacing();
    const splitByGrapheme = this.splitByGrapheme;
    const infix = splitByGrapheme ? "" : " ";
    const maxWidth = Math.max(desiredWidth - reservedSpace, this.minWidth || 1);
    const data = this.breakWordsToFit(wordsData[lineIndex] ?? [], maxWidth, lineIndex);
    const graphemeLines: string[][] = [];
    let lineWidth = 0;
    let line: string[] = [];
    let offset = 0;
    let infixWidth = 0;
    let lineJustStarted = true;

    for (const { word, width: wordWidth } of data) {
      offset += word.length;
      lineWidth += infixWidth + wordWidth - additionalSpace;
      if (lineWidth > maxWidth && !lineJustStarted) {
        graphemeLines.push(line);
        line = [];
        lineWidth = wordWidth;
        lineJustStarted = true;
      } else {
        lineWidth += additionalSpace;
      }
      if (!lineJustStarted && !splitByGrapheme) {
        line.push(infix);
      }
      line = line.concat(word);
      infixWidth = splitByGrapheme ? 0 : this._measureWord([infix], lineIndex, offset);
      offset++;
      lineJustStarted = false;
    }

    if (data.length > 0) {
      graphemeLines.push(line);
    }

    this.dynamicMinWidth = 0;
    return graphemeLines;
  }

  private breakWordsToFit(
    words: { word: string[]; width: number }[],
    maxWidth: number,
    lineIndex: number,
  ): { word: string[]; width: number }[] {
    const fitted: { word: string[]; width: number }[] = [];
    for (const item of words) {
      if (item.width <= maxWidth || item.word.length <= 1) {
        fitted.push(item);
        continue;
      }

      let chunk: string[] = [];
      for (const grapheme of item.word) {
        const next = [...chunk, grapheme];
        const nextWidth = this._measureWord(next, lineIndex);
        if (chunk.length > 0 && nextWidth > maxWidth) {
          fitted.push({ word: chunk, width: this._measureWord(chunk, lineIndex) });
          chunk = [grapheme];
        } else {
          chunk = next;
        }
      }
      if (chunk.length > 0) {
        fitted.push({ word: chunk, width: this._measureWord(chunk, lineIndex) });
      }
    }
    return fitted;
  }

  override _getTopOffset() {
    const extra = Math.max(0, this.height - this.calcTextHeight());
    const shift = this.originY === "bottom" ? extra : this.originY === "center" ? extra / 2 : 0;
    return -this.height / 2 + shift;
  }

  override enterEditingImpl() {
    super.enterEditingImpl();
    this.widthBeforeEditing = this.width;
  }

  override exitEditingImpl() {
    super.exitEditingImpl();
    this.widthBeforeEditing = undefined;
  }

  override updateFromTextArea(): void {
    const frameWidth = this.widthBeforeEditing ?? this.width;
    super.updateFromTextArea();
    this.set({ width: frameWidth });

    if (this.fontAutoSize) {
      this.shrinkText(frameWidth, this.text.split("\n").length);
    }
  }

  override toObject<T extends Omit<Props & fabric.TClassProperties<this>, keyof SProps>, K extends keyof T = never>(
    propertiesToInclude: K[] = [],
  ): Pick<T, K> & SProps {
    return super.toObject([...propertiesToInclude, ...TEXTBOX_PROPS] as (keyof T)[]);
  }
}
