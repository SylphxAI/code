/**
 * Type declarations for modules without types
 */

declare module "dirty-json" {
	export function parse(text: string): any;
}

declare module "mime-types" {
	export function lookup(path: string): string | false;
	export function contentType(type: string): string | false;
	export function extension(type: string): string | false;
	export function charset(type: string): string | false;
}
