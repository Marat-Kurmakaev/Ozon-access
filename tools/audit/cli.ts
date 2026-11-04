import { resolve } from 'node:path';
import { runFixture, runLive } from './runner';
import { reportMetrics, writeReports } from './reports';
import { runTargetedLive, writeTargetedReport } from './targeted';

const mode = process.argv[2] ?? 'fixture';
const allowSafeInteractions = process.argv.includes('--allow-safe-interactions');
const groupsArgument = process.argv.find((argument) => argument.startsWith('--groups='));
const groupIds = groupsArgument?.slice('--groups='.length).split(',').map((value) => value.trim()).filter(Boolean) ?? [];
const allowArrowInteractions = process.argv.includes('--allow-arrow-interactions');
const headed = process.argv.includes('--headed');
const browserChannel = process.argv.find((argument) => argument.startsWith('--browser-channel='))?.slice('--browser-channel='.length);

if (!['fixture', 'compare', 'live', 'live-groups'].includes(mode)) {
  console.error('Использование: tsx tools/audit/cli.ts fixture|compare|live|live-groups [--groups=id,id] [--allow-arrow-interactions]');
  process.exitCode = 2;
} else if (mode === 'live-groups') {
  if (!groupIds.length) {
    console.error('Для live-groups требуется --groups=element-group-NNN');
    process.exitCode = 2;
  } else {
    const output = resolve('reports', 'live-groups');
    const result = await runTargetedLive(groupIds, allowArrowInteractions, { headed, browserChannel });
    await writeTargetedReport(result, output);
    console.log(JSON.stringify({ mode, output, requested: result.requestedGroups.length, found: result.observations.filter((item) => item.found).length, errors: result.errors.length }, null, 2));
  }
} else {
  const result = mode === 'live' ? await runLive(allowSafeInteractions) : await runFixture(mode === 'compare');
  const output = mode === 'fixture' ? resolve('reports') : resolve('reports', mode);
  await writeReports(result, output);
  const metrics = reportMetrics(result);
  console.log(JSON.stringify({ mode, output, elements: result.elements.length, groups: result.groups.length, ...metrics }, null, 2));
  if (result.behavior.errors.length) console.warn(`Аудит завершён с ограничениями: ${result.behavior.errors.join('; ')}`);
}
