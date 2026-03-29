export type ProjectItem = {
	id: string;
	name: string;
	path: string;
	group: string;
	createdAt: number;
	lastOpenedAt?: number;
};

export type OpenTarget = 'current' | 'new';
