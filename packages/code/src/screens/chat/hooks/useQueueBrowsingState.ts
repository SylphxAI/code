/**
 * Queue Browsing State Hook
 * Manages queue browsing navigation state (similar to message history browsing)
 */

import type { FileAttachment } from "@sylphx/code-core";
import { useState } from "react";

export interface QueueBrowsingState {
	queueBrowseIndex: number;
	setQueueBrowseIndex: (index: number) => void;
	tempQueueInput: string;
	setTempQueueInput: (input: string) => void;
	tempQueueAttachments: FileAttachment[];
	setTempQueueAttachments: (attachments: FileAttachment[]) => void;
}

export function useQueueBrowsingState(): QueueBrowsingState {
	const [queueBrowseIndex, setQueueBrowseIndex] = useState(-1);
	const [tempQueueInput, setTempQueueInput] = useState("");
	const [tempQueueAttachments, setTempQueueAttachments] = useState<FileAttachment[]>([]);

	return {
		queueBrowseIndex,
		setQueueBrowseIndex,
		tempQueueInput,
		setTempQueueInput,
		tempQueueAttachments,
		setTempQueueAttachments,
	};
}
