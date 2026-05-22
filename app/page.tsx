import fs from "fs";
import path from "path";

export default function Home() {
  const filesDir = path.join(process.cwd(), "public/files");

  let files: string[] = [];

  try {
    files = fs.readdirSync(filesDir);
  } catch {
    files = [];
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold mb-8">
        SiuuuPHULON Archive
      </h1>

      {files.length === 0 ? (
        <p>No files found.</p>
      ) : (
        <div className="space-y-3">
          {files.map((file) => (
            <div
              key={file}
              className="bg-zinc-900 p-4 rounded-xl flex justify-between items-center"
            >
              <span>{file}</span>

              <div className="flex gap-3">
                <a
                  href={`/files/${file}`}
                  target="_blank"
                  className="bg-blue-600 px-4 py-2 rounded-lg"
                >
                  View
                </a>

                <a
                  href={`/files/${file}`}
                  download
                  className="bg-green-600 px-4 py-2 rounded-lg"
                >
                  Download
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
