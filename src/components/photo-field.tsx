"use client";

import { useState } from "react";

export function PhotoField({ initial }: { initial?: string }) {
  const [preview, setPreview] = useState(initial ?? "");
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose a photo.");
      return;
    }
    try {
      const data = await shrink(file);
      if (data.length > 160_000) {
        setError("That photo is still too big.");
        return;
      }
      setError("");
      setPreview(data);
    } catch {
      setError("Could not read that photo. JPEG or PNG works best.");
    }
  }

  return (
    <div className="photo-field">
      {preview ? <img src={preview} alt="" /> : <div className="photo-empty">Add a photo</div>}
      <div className="actions">
        <label className="button quiet">
          Choose photo
          <input
            className="visually-hidden"
            type="file"
            accept="image/*"
            onChange={(event) => void onFile(event.target.files?.[0])}
          />
        </label>
        {preview ? (
          <button type="button" className="button quiet" onClick={() => setPreview("")}>
            Remove
          </button>
        ) : null}
      </div>
      <input type="hidden" name="photo" value={preview} />
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}

function shrink(file: File) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      let size = 1000;
      let quality = 0.7;
      let data = paint(image, size, quality);
      while (data.length > 150_000 && (quality > 0.45 || size > 480)) {
        if (quality > 0.45) quality -= 0.1;
        else size = Math.round(size * 0.75);
        data = paint(image, size, quality);
      }
      URL.revokeObjectURL(url);
      resolve(data);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    image.src = url;
  });
}

function paint(image: HTMLImageElement, max: number, quality: number) {
  const scale = Math.min(1, max / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) return "";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}
