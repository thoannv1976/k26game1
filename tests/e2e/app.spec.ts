import { expect, test, type Page } from '@playwright/test';
import M01 from '../../content/missions/M01.json' with { type: 'json' };

const PASSWORD = 'Demo-12345';

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
  await expect(page).not.toHaveURL(/\/login/);
}

async function openMission(page: Page, building: string, missionId: string) {
  await page.goto('/city');
  await expect(page.getByTestId('city-map')).toBeVisible();
  await page.getByTestId(`building-${building}`).click();
  await page.getByTestId(`mission-card-${missionId}`).click();
  await expect(page).toHaveURL(new RegExp(`/missions/${missionId}`));
}

async function startOrContinue(page: Page) {
  const cont = page.getByTestId('mission-continue');
  const start = page.getByTestId('mission-start');
  await expect(cont.or(start).first()).toBeVisible();
  if (await cont.isVisible()) await cont.click();
  else await start.click();
  await expect(page).toHaveURL(/\/play\//);
  await expect(page.getByTestId('play-npc-line')).toBeVisible();
}

test.describe.configure({ mode: 'serial' });

test('student completes M01 by text and sees the assessment', async ({ page }) => {
  await login(page, 'student1@demo.edu.vn');
  await expect(page).toHaveURL(/\/student/);
  await openMission(page, 'airport', 'M01');
  await startOrContinue(page);

  for (const line of M01.stages.flatMap((s) => s.sampleStudentLines)) {
    if (await page.getByTestId('play-text-input').isDisabled()) break;
    await page.getByTestId('play-text-input').fill(line);
    const reply = page.waitForResponse((r) => r.url().includes('/turns') && r.request().method() === 'POST');
    await page.getByTestId('play-text-send').click();
    expect((await reply).status()).toBe(200);
    await expect(page.getByTestId('play-text-input')).toHaveValue('');
  }
  for (const stage of M01.stages) {
    for (const o of stage.objectives.filter((x) => x.required)) {
      await expect(page.getByTestId(`play-objective-${o.id}`)).toHaveAttribute('data-met', 'true');
    }
  }
  await page.getByTestId('play-finish').click();
  await expect(page).toHaveURL(/\/results\//, { timeout: 30_000 });
  await expect(page.getByTestId('results-percent')).toContainText('%');
  await expect(page.getByTestId('results-criterion-taskCompletion')).toHaveAttribute('data-status', 'assessed');
  // Text mode is not speaking evidence: fluency is not assessed.
  await expect(page.getByTestId('results-criterion-fluency')).toHaveAttribute('data-status', 'not_assessed');
});

test('student speaks to the NPC with the microphone', async ({ page }) => {
  await login(page, 'student2@demo.edu.vn');
  await openMission(page, 'airport', 'M02');
  await startOrContinue(page);
  const mic = page.getByTestId('play-mic');
  await mic.click();
  await page.getByTestId('consent-agree').click();
  if ((await mic.getAttribute('data-state')) !== 'recording') await mic.click();
  await expect(mic).toHaveAttribute('data-state', 'recording');
  await page.waitForTimeout(2500);
  const reply = page.waitForResponse((r) => r.url().includes('/voice') && r.request().method() === 'POST', { timeout: 20_000 });
  await mic.click();
  expect((await reply).status()).toBe(200);
  // The offline STT returns the stage's sample line → the first objective is met.
  await expect(page.locator('[data-testid^="play-objective-"][data-met="true"]').first()).toBeVisible();
  // Reloading resumes the same session.
  const url = page.url();
  await page.reload();
  await expect(page).toHaveURL(url);
  await expect(page.locator('[data-testid^="play-objective-"][data-met="true"]').first()).toBeVisible();
});

test('teacher reviews the class and exports CSV', async ({ page }) => {
  await login(page, 'teacher@demo.edu.vn');
  await expect(page).toHaveURL(/\/teacher/);
  await page.getByTestId('teacher-class-eng-comm-1').click();
  await expect(page.getByText('Trần Minh Anh').first()).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByTestId('export-csv').click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('results-ENG101.csv');
});

test('school admin sees users, missions and usage', async ({ page }) => {
  await login(page, 'admin@demo.edu.vn');
  await expect(page).toHaveURL(/\/admin/);
  await page.goto('/admin/users');
  await expect(page.getByText('student1@demo.edu.vn').first()).toBeVisible();
  await page.goto('/admin/missions');
  await expect(page.getByText('M06').first()).toBeVisible();
  await page.goto('/admin/usage');
  await expect(page.locator('main')).toBeVisible();
});

test('students cannot open admin pages', async ({ page }) => {
  await login(page, 'student3@demo.edu.vn');
  await page.goto('/admin/users');
  await expect(page.getByText('student1@demo.edu.vn')).toHaveCount(0);
});

test('city map works on a phone @mobile', async ({ page }) => {
  await login(page, 'student3@demo.edu.vn');
  await page.goto('/city');
  await expect(page.getByTestId('city-map')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
