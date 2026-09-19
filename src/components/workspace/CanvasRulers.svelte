<script lang="ts">
  import type { PrintDirection } from "@mmote/niimbluelib";
  import { tr } from "$/utils/i18n";

  interface Props {
    container?: HTMLElement;
    target?: HTMLElement;
    dpmm: number;
    zoom: number;
    printDirection: PrintDirection;
    revision?: number;
  }

  let { container, target, dpmm, zoom, printDirection, revision = 0 }: Props = $props();

  const RULER = 20;
  let hCanvas: HTMLCanvasElement | undefined = $state();
  let vCanvas: HTMLCanvasElement | undefined = $state();

  const draw = () => {
    if (!container || !target || !hCanvas || !vCanvas) {
      return;
    }

    const cr = container.getBoundingClientRect();
    const tr = target.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const originX = tr.left - cr.left;
    const originY = tr.top - cr.top;
    const pxPerMm = Math.max(dpmm * zoom, 0.01);

    paintRuler(hCanvas, cr.width, RULER, dpr, originX, pxPerMm, "horizontal");
    paintRuler(vCanvas, RULER, cr.height, dpr, originY, pxPerMm, "vertical");
  };

  const paintRuler = (
    canvas: HTMLCanvasElement,
    cssW: number,
    cssH: number,
    dpr: number,
    origin: number,
    pxPerMm: number,
    axis: "horizontal" | "vertical",
  ) => {
    const width = Math.max(1, Math.round(cssW * dpr));
    const height = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== width) {
      canvas.width = width;
    }
    if (canvas.height !== height) {
      canvas.height = height;
    }
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.fillStyle = "#e8eef4";
    ctx.fillRect(0, 0, cssW, cssH);

    ctx.strokeStyle = "#d5dee6";
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (axis === "horizontal") {
      ctx.moveTo(0, cssH - 0.5);
      ctx.lineTo(cssW, cssH - 0.5);
    } else {
      ctx.moveTo(cssW - 0.5, 0);
      ctx.lineTo(cssW - 0.5, cssH);
    }
    ctx.stroke();

    const length = axis === "horizontal" ? cssW : cssH;
    const startMm = Math.floor(-origin / pxPerMm) - 1;
    const endMm = Math.ceil((length - origin) / pxPerMm) + 1;

    ctx.fillStyle = "#7d8b97";
    ctx.strokeStyle = "#8a97a3";
    ctx.font = "9px ui-sans-serif, system-ui, sans-serif";
    ctx.textBaseline = "middle";

    for (let mm = startMm; mm <= endMm; mm++) {
      const pos = origin + mm * pxPerMm;
      if (pos < -8 || pos > length + 8) {
        continue;
      }
      const major = mm % 10 === 0;
      const mid = mm % 5 === 0;
      const tick = major ? 11 : mid ? 7 : 4;

      ctx.beginPath();
      if (axis === "horizontal") {
        ctx.moveTo(pos + 0.5, cssH);
        ctx.lineTo(pos + 0.5, cssH - tick);
      } else {
        ctx.moveTo(cssW, pos + 0.5);
        ctx.lineTo(cssW - tick, pos + 0.5);
      }
      ctx.stroke();

      if (major) {
        const label = String(mm);
        if (axis === "horizontal") {
          ctx.textAlign = "center";
          ctx.fillText(label, pos, 7);
        } else if (mm !== 0) {
          ctx.save();
          ctx.translate(8, pos);
          ctx.rotate(-Math.PI / 2);
          ctx.textAlign = "center";
          ctx.fillText(label, 0, 0);
          ctx.restore();
        }
      }
    }
  };

  $effect(() => {
    void dpmm;
    void zoom;
    void revision;
    void printDirection;
    const stage = container;
    const canvas = target;
    const onScroll = () => draw();
    const observer = new ResizeObserver(() => draw());
    if (stage) {
      observer.observe(stage);
      stage.addEventListener("scroll", onScroll);
    }
    if (canvas) {
      observer.observe(canvas);
      canvas.addEventListener("scroll", onScroll);
    }
    window.addEventListener("resize", draw);
    requestAnimationFrame(draw);
    return () => {
      observer.disconnect();
      stage?.removeEventListener("scroll", onScroll);
      canvas?.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", draw);
    };
  });
</script>

<div class="canvas-rulers" aria-hidden="true">
  <div class="canvas-rulers__corner"></div>
  <canvas class="canvas-rulers__h" bind:this={hCanvas}></canvas>
  <canvas class="canvas-rulers__v" bind:this={vCanvas}></canvas>
  <div class="canvas-rulers__direction" class:is-left={printDirection === "left"} class:is-top={printDirection === "top"}>
    {$tr("editor.canvas.direction")}
    <span>{printDirection === "top" ? "↓" : "←"}</span>
  </div>
</div>

<style>
  .canvas-rulers {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 2;
  }

  .canvas-rulers__corner {
    position: absolute;
    top: 0;
    left: 0;
    width: 20px;
    height: 20px;
    background: #e8eef4;
    border-right: 1px solid #d5dee6;
    border-bottom: 1px solid #d5dee6;
    z-index: 3;
  }

  .canvas-rulers__h,
  .canvas-rulers__v {
    position: absolute;
    display: block;
  }

  .canvas-rulers__h {
    top: 0;
    left: 0;
    width: 100%;
    height: 20px;
  }

  .canvas-rulers__v {
    top: 0;
    left: 0;
    width: 20px;
    height: 100%;
  }

  .canvas-rulers__direction {
    position: absolute;
    top: 28px;
    left: 50%;
    color: #9aa4ae;
    font-size: 11px;
    letter-spacing: 0.02em;
    transform: translateX(-50%);
    white-space: nowrap;
  }
</style>
