export interface DesktopWindowApi {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  onMaximized: (callback: (maximized: boolean) => void) => () => void;
}

export interface DesktopApi {
  isDesktop: true;
  platform: string;
  window: DesktopWindowApi;
}

export function getDesktop(): DesktopApi | undefined {
  return (window as Window & { niimblueDesktop?: DesktopApi }).niimblueDesktop;
}
