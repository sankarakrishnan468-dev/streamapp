import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const uploadDirectory = path.resolve('uploads/videos');

export async function uploadVideoFile(buffer, originalName = '') {
  await mkdir(uploadDirectory, { recursive: true });
  const extension = path.extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, '');
  const publicId = `${randomUUID()}${extension || '.mp4'}`;
  await writeFile(path.join(uploadDirectory, publicId), buffer);
  return { public_id: `videos/${publicId}` };
}

export async function deleteVideoFile(publicId) {
  if (!publicId) return;
  const filePath = path.resolve('uploads', publicId);
  if (!filePath.startsWith(path.resolve('uploads') + path.sep)) return;
  await unlink(filePath).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  });
}
