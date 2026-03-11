import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

// Minimal 1x1 transparent WebP
const TRANSPARENT_WEBP = Buffer.from(
  "UklGRlYAAABXRUJQVlA4IEoAAADQAQCdASoBAAEAAUAmJYgCdAEO/gHOAAD++P/////9/////8////8H////A////wD////A////wH////A////wAAAAAAAAAAAAA==",
  "base64"
);

const HEADERS_HIT = {
  "Content-Type": "image/webp",
  "Cache-Control": "public, max-age=604800, immutable",
};

const HEADERS_MISS = {
  "Content-Type": "image/webp",
  "Cache-Control": "public, max-age=86400",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Prevent path traversal
  if (slug.includes("..") || slug.includes("/")) {
    return new NextResponse(TRANSPARENT_WEBP, { headers: HEADERS_MISS });
  }

  try {
    const filePath = path.join(process.cwd(), "public", "favicons", `${slug}.webp`);
    const file = await readFile(filePath);
    return new NextResponse(file, { headers: HEADERS_HIT });
  } catch {
    return new NextResponse(TRANSPARENT_WEBP, { headers: HEADERS_MISS });
  }
}
