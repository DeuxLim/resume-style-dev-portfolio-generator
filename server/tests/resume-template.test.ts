import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStarterResume } from '../../shared/defaults/resume.js';
import { mapResumeRow, renderResumePdf, serializeResume, validateResume } from '../lib/resume.js';
import { groupResumeSkills } from '../../shared/lib/resume.js';

test('serializeResume preserves deux_modern_v1 template key', () => {
  const resume = buildStarterResume({
    fullName: 'Test User',
    email: 'test@example.com',
    location: 'Manila',
    headline: 'Junior Full Stack Web Developer',
  });

  resume.templateKey = 'deux_modern_v1';
  const serialized = serializeResume(resume);

  assert.equal(serialized.templateKey, 'deux_modern_v1');
});

test('mapResumeRow accepts deux_modern_v1 template key', () => {
  const fallback = buildStarterResume({
    fullName: 'Fallback User',
    email: 'fallback@example.com',
    location: '',
    headline: '',
  });

  const row = {
    template_key: 'deux_modern_v1',
    content_json: JSON.stringify(fallback.content),
    layout_json: JSON.stringify(fallback.layout),
  };

  const mapped = mapResumeRow(row, fallback);
  assert.equal(mapped.templateKey, 'deux_modern_v1');
});

test('renderResumePdf supports deux_modern_v1', async () => {
  const resume = buildStarterResume({
    fullName: 'Render User',
    email: 'render@example.com',
    location: 'Quezon City',
    headline: 'Junior Full Stack Web Developer',
  });
  resume.templateKey = 'deux_modern_v1';

  const validation = validateResume(resume);
  assert.equal(validation.canExportPdf, true);

  const doc = renderResumePdf(resume, validation);
  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve());
    doc.on('error', (error) => reject(error));
    doc.end();
  });

  const pdfBuffer = Buffer.concat(chunks);
  assert.equal(pdfBuffer.slice(0, 5).toString(), '%PDF-');
});

test('groupResumeSkills categorizes common skills for Modern ATS', () => {
	const groups = groupResumeSkills([
		'PHP',
		'Laravel',
		'MySQL',
		'Git',
		'Tailwind CSS',
		'API Integrations',
	]);

	assert.deepEqual(
		groups.map((group) => group.category),
		[
			'Languages & Frameworks',
			'Databases',
			'Tools & Technologies',
			'Frontend',
			'Core',
		],
	);
});
