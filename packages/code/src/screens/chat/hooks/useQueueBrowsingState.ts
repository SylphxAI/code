/**
 * Queue Browsing State Hook
 * Manages queue browsing navigation state using Zen signals
 */

import {
	useQueueBrowseIndex,
	setQueueBrowseIndex as setQueueBrowseIndexSignal,
	useTempQueueInput,
	setTempQueueInput as setTempQueueInputSignal,
	useTempQueueAttachments,
	setTempQueueAttachments as setTempQueueAttachmentsSignal,
} from "@sylphx/code-client";
import type { FileAttachment } from "@sylphx/code-core";

export interface QueueBrowsingState {
	queueBrowseIndex: number;
	setQueueBrowseIndex: (index: number) => void;
	tempQueueInput: string;
	setTempQueueInput: (input: string) => void;
	tempQueueAttachments: FileAttachment[];
	setTempQueueAttachments: (attachments: FileAttachment[]) => void;
}

export function useQueueBrowsingState(): QueueBrowsingState {
	const queueBrowseIndex = useQueueBrowseIndex();
	const tempQueueInput = useTempQueueInput();
	const tempQueueAttachments = useTempQueueAttachments();

	return {
		queueBrowseIndex,
		setQueueBrowseIndex: setQueueBrowseIndexSignal,
		tempQueueInput,
		setTempQueueInput: setTempQueueInputSignal,
		tempQueueAttachments,
		setTempQueueAttachments: setTempQueueAttachmentsSignal,
	};
}
