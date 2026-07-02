import React from 'react';

interface ReactNativeAsset {
	file?: File;
	uri: string;
	name?: string;
	mimeType?: string;
}

interface UploadInput {
	reactNativeAsset?: ReactNativeAsset;
	file?: File;
	url?: string;
	base64?: string;
	buffer?: Buffer;
	slug?: string;
	uploadIntent?: string;
}

interface UploadResult {
	url?: string;
	mimeType?: string | null;
	error?: string;
}

interface UploadHookResult {
	loading: boolean;
}

async function requestUploadIntent(options: {
	purpose: 'partner_apply' | 'guest_checkout';
	attemptId?: string;
	slug?: string;
}) {
	const body =
		options.purpose === 'partner_apply'
			? { purpose: options.purpose, attempt_id: options.attemptId }
			: { purpose: options.purpose, slug: options.slug };

	const response = await fetch('/api/upload-intent', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	if (!response.ok) {
		throw new Error('Failed to authorize upload');
	}
	const data = (await response.json()) as { upload_intent?: string };
	if (!data.upload_intent) {
		throw new Error('Failed to authorize upload');
	}
	return data.upload_intent;
}

function buildUploadHeaders(input: UploadInput, uploadIntent?: string) {
	const headers: Record<string, string> = {};
	if (input.slug) {
		headers['X-Partner-Slug'] = input.slug;
	}
	if (uploadIntent) {
		headers['X-Upload-Intent'] = uploadIntent;
	}
	return headers;
}

function useUpload(): [(input: UploadInput) => Promise<UploadResult>, UploadHookResult] {
	const [loading, setLoading] = React.useState(false);
	const upload = React.useCallback(async (input: UploadInput): Promise<UploadResult> => {
		try {
			setLoading(true);
			let uploadIntent = input.uploadIntent;
			if (!uploadIntent && input.slug) {
				uploadIntent = await requestUploadIntent({
					purpose: 'guest_checkout',
					slug: input.slug,
				});
			}

			let response: Response | undefined;
			if ('reactNativeAsset' in input && input.reactNativeAsset) {
				if (input.reactNativeAsset.file) {
					const formData = new FormData();
					formData.append('file', input.reactNativeAsset.file);
					if (uploadIntent) formData.append('upload_intent', uploadIntent);
					if (input.slug) formData.append('slug', input.slug);
					response = await fetch('/api/upload', {
						method: 'POST',
						headers: buildUploadHeaders(input, uploadIntent),
						body: formData,
					});
				} else {
					throw new Error('Upload client not configured');
				}
			} else if ('file' in input && input.file) {
				const formData = new FormData();
				formData.append('file', input.file);
				if (uploadIntent) formData.append('upload_intent', uploadIntent);
				if (input.slug) formData.append('slug', input.slug);
				response = await fetch('/api/upload', {
					method: 'POST',
					headers: buildUploadHeaders(input, uploadIntent),
					body: formData,
				});
			} else {
				throw new Error('Only file uploads are supported');
			}
			if (!response.ok) {
				if (response.status === 413) {
					throw new Error('Upload failed: File too large.');
				}
				const data = await response.json().catch(() => null);
				throw new Error(data?.error || 'Upload failed');
			}
			const data = await response.json();
			return { url: data.url, mimeType: data.mimeType || null };
		} catch (uploadError) {
			if (uploadError instanceof Error) {
				return { error: uploadError.message };
			}
			if (typeof uploadError === 'string') {
				return { error: uploadError };
			}
			return { error: 'Upload failed' };
		} finally {
			setLoading(false);
		}
	}, []);

	return [upload, { loading }];
}

export default useUpload;

export async function requestPartnerApplyUploadIntent(attemptId: string) {
	return requestUploadIntent({ purpose: 'partner_apply', attemptId });
}
