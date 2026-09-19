<script lang="ts">
  import type { ExportedLabelTemplate } from "$/types";

  interface Props {
    label: ExportedLabelTemplate;
  }

  let { label }: Props = $props();

  interface PreviewObject {
    kind: "text" | "qr" | "barcode" | "shape";
    left: number;
    top: number;
    width: number;
    height: number;
    text?: string;
    fontSize?: number;
    fontWeight?: string | number;
    radius?: number;
  }

  const objects = $derived.by(() => {
    const source = (label.canvas?.objects ?? []) as unknown as Array<Record<string, unknown>>;
    return source.map((obj): PreviewObject => {
      const type = String(obj.type ?? "");
      const left = Number(obj.left ?? 0);
      const top = Number(obj.top ?? 0);
      const width = Number(obj.width ?? 24);
      const height = Number(obj.height ?? obj.fontSize ?? 16);
      if (type === "QRCode") {
        return { kind: "qr", left, top, width, height };
      }
      if (type === "Barcode") {
        return { kind: "barcode", left, top, width, height };
      }
      if (type === "Textbox" || type === "IText" || type === "Text") {
        return {
          kind: "text",
          left,
          top,
          width,
          height,
          text: String(obj.text ?? ""),
          fontSize: Number(obj.fontSize ?? 12),
          fontWeight: (obj.fontWeight as string | number | undefined) ?? "normal",
        };
      }
      return { kind: "shape", left, top, width, height, radius: type === "Circle" ? width / 2 : 0 };
    });
  });

  const canvasWidth = $derived(Math.max(label.label.size.width, 1));
  const canvasHeight = $derived(Math.max(label.label.size.height, 1));
  const rounded = $derived(label.label.shape === "rounded_rect" || label.label.shape === "circle");
</script>

<div class="label-preview" style={`aspect-ratio: ${canvasWidth} / ${canvasHeight}`}>
  <svg viewBox={`0 0 ${canvasWidth} ${canvasHeight}`} role="img" aria-hidden="true">
    <rect
      x="0"
      y="0"
      width={canvasWidth}
      height={canvasHeight}
      fill="#fff"
      rx={rounded ? Math.min(canvasWidth, canvasHeight) * 0.12 : 0} />
    {#each objects as obj, index (`${obj.kind}-${index}`)}
      {#if obj.kind === "qr"}
        <g transform={`translate(${obj.left} ${obj.top})`}>
          <rect width={obj.width} height={obj.height} fill="#111" />
          <rect x={obj.width * 0.12} y={obj.height * 0.12} width={obj.width * 0.76} height={obj.height * 0.76} fill="#fff" />
          <rect x={obj.width * 0.22} y={obj.height * 0.22} width={obj.width * 0.18} height={obj.height * 0.18} fill="#111" />
          <rect x={obj.width * 0.6} y={obj.height * 0.22} width={obj.width * 0.18} height={obj.height * 0.18} fill="#111" />
          <rect x={obj.width * 0.22} y={obj.height * 0.6} width={obj.width * 0.18} height={obj.height * 0.18} fill="#111" />
          <rect x={obj.width * 0.46} y={obj.height * 0.46} width={obj.width * 0.16} height={obj.height * 0.16} fill="#111" />
        </g>
      {:else if obj.kind === "barcode"}
        <g transform={`translate(${obj.left} ${obj.top})`}>
          {#each Array.from({ length: 18 }) as _, bar (bar)}
            <rect
              x={(obj.width / 18) * bar}
              y="0"
              width={bar % 3 === 0 ? 1.6 : 3.2}
              height={obj.height}
              fill={bar % 4 === 1 ? "transparent" : "#111"} />
          {/each}
        </g>
      {:else if obj.kind === "text"}
        <text
          x={obj.left}
          y={obj.top + (obj.fontSize ?? 12)}
          fill="#111"
          font-size={obj.fontSize}
          font-weight={obj.fontWeight}
          font-family="Noto Sans, sans-serif">{obj.text}</text>
      {:else}
        <rect x={obj.left} y={obj.top} width={obj.width} height={obj.height} fill="none" stroke="#111" stroke-width="2" rx={obj.radius ?? 0} />
      {/if}
    {/each}
  </svg>
</div>

<style>
  .label-preview {
    width: 86%;
    max-height: 88%;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(17, 17, 17, 0.08);
    overflow: hidden;
  }

  svg {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
