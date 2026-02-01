export interface Settings {
	groupBy?: string;
	groupByConfig?: {
		direction: "ASC" | "DESC",
		property: string;
	},
	splitColumnsBy?: string;
}
