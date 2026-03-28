export type Message = {
	role: "user" | "model";
	parts: { text: string }[];
};
