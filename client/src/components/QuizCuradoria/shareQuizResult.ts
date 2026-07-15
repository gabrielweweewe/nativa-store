import html2canvas from "html2canvas";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function captureShareCard(element: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(element, {
    width: 1080,
    height: 1080,
    scale: 1,
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#F5F0E8",
    logging: false,
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Não foi possível gerar a imagem"));
          return;
        }
        resolve(blob);
      },
      "image/png",
      1,
    );
  });
}

export async function downloadShareImage(blob: Blob, filename: string) {
  triggerDownload(blob, filename);
}

export function canNativeShareFiles(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }
  if (typeof navigator.canShare !== "function") {
    return true;
  }
  try {
    const file = new File(["x"], "test.png", { type: "image/png" });
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export async function shareOrDownloadImage(
  blob: Blob,
  filename: string,
  shareText: string,
): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: "image/png" });

  if (canNativeShareFiles()) {
    try {
      await navigator.share({
        files: [file],
        title: shareText,
        text: shareText,
      });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      // Fallback para download
    }
  }

  await downloadShareImage(blob, filename);
  return "downloaded";
}
