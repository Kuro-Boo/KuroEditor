// 型定義: src/job.js(DOM 非依存・外部依存ゼロの JobCard 純関数)。仕様 editor-editor-spec-job・cms-job。
// Entamy のモノレポの製品(KuroCMS)は src を直接 import する(写しは置かない)。

export interface JobSalary {
  currency: string;
  unit: string;
  min?: number;
  max?: number;
}
export interface JobLocation {
  country: string;
  region: string;
  locality: string;
  postalCode?: string;
  street?: string;
}
/** JobCard の保存データ(`data-job` の正本)。 */
export interface Job {
  version: number;
  /** 募集中(入切)。 */
  open: boolean;
  /** 募集を始めた日(YYYY-MM-DD・datePosted)。 */
  openedAt?: string;
  employmentType: string[];
  salary?: JobSalary;
  salaryNote?: string;
  location: JobLocation;
  hours?: string;
  requirements?: string;
  /** 待遇(賞与・保険・通勤費・休暇など・複数行・jobBenefits)。 */
  benefits?: string;
  /** 募集人数(「3名」「数名」など・数だけのときは totalJobOpenings)。 */
  openings?: string;
  /** 問い合わせ先(電話番号と補足・複数行・applicationContact)。 */
  contact?: string;
  /** 掲載期限(YYYY-MM-DD・決まっている求人だけ)。 */
  validThrough?: string;
}

export const JOB_VERSION: number;
export const JOB_BLOCK: string;
export const JOB_CARD_SEL: string;
export const EMPLOYMENT_TYPES: [string, string][];
export const SALARY_UNITS: [string, string][];
export const SALARY_CURRENCIES: string[];
export const JOB_LIMITS: { noteMax: number; hoursMax: number; requirementsMax: number; benefitsMax: number; openingsMax: number; contactMax: number; addressPartMax: number; salaryMax: number };
export function isIsoDate(s: unknown): boolean;
export function normalizeJob(raw: unknown): Job;
export function validateJob(j: unknown): string[];
export function encodeJob(j: Job): string;
export function decodeJob(attr: unknown): Record<string, unknown> | null;
/** 募集中か(open が真で、期限が無いか today 以後)。today を渡さなければ期限は見ない。 */
export function jobIsOpen(j: Job | null | undefined, today?: string): boolean;
export function employmentLabels(j: Job): string[];
export function formatSalary(j: Job): string;
export function formatLocation(j: Job): string;
/** 募集人数が数だけ(「3」「3名」)のときの人数。ほかは null。 */
export function openingsCount(j: Job | null | undefined): number | null;
/** 問い合わせ先の最初の電話番号。無ければ空。 */
export function contactTelephone(j: Job | null | undefined): string;
export function renderJobPreview(j: Job, opt?: { today?: string }): string;
export function buildJobCardHtml(j: Job, opt?: { today?: string }): string;
export function emptyJob(): Job;
export function stampOpenedAt(before: Job | null, after: Job, today: string): Job;
