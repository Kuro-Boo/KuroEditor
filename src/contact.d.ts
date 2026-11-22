// 型定義: src/contact.js(DOM 非依存・外部依存ゼロの ContactForm 純関数)。仕様 editor-editor-spec-contact・cms-contact。

export interface ContactField {
  kind: string;
  label: string;
  required: boolean;
  options?: string[];
}
/** ContactForm の保存データ(`data-contact` の正本)。アドレスは持たない(to はホストが登録した送り先の名前)。 */
export interface ContactForm {
  version: number;
  subject: string;
  fields: ContactField[];
  submitLabel?: string;
  doneMessage?: string;
  note?: string;
  to?: string[];
}
/** ホストが渡す送り先の候補(名前と表示名だけ。アドレスはエディタに渡さない)。 */
export interface ContactRecipientOption {
  name: string;
  label: string;
}
export interface SubmissionResult {
  ok: boolean;
  errors: Record<string, string>;
  clean: { label: string; kind: string; value: string }[];
}

export const CONTACT_VERSION: number;
export const CONTACT_BLOCK: string;
export const CONTACT_CARD_SEL: string;
export const RECIPIENT_NAME_RE: RegExp;
export const FIELD_KINDS: [string, string][];
export const CONTACT_LIMITS: {
  perBody: number; subjectMax: number; fieldsMax: number; labelMax: number; optionsMax: number;
  optionMax: number; submitMax: number; doneMax: number; noteMax: number; toMax: number; valueMax: number; textareaMax: number;
};
export const CONTACT_DEFAULTS: { submitLabel: string; doneMessage: string };
export function normalizeContactForm(raw: unknown): ContactForm;
export function validateContactForm(c: unknown): string[];
export function encodeContactForm(c: ContactForm): string;
export function decodeContactForm(attr: unknown): Record<string, unknown> | null;
export function renderContactPreview(c: ContactForm): string;
export function buildContactCardHtml(c: ContactForm): string;
export function renderContactFormHtml(c: ContactForm, host: { form: string; sig: string; endpoint: string }): string;
export function isEmail(v: unknown): boolean;
export function validateSubmission(c: ContactForm, values: Record<string, unknown>): SubmissionResult;
export function emptyContactForm(): ContactForm;
