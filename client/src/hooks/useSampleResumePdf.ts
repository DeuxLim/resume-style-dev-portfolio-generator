import { useEffect, useMemo, useState } from "react";
import { apiBaseUrl } from "@/lib/axios.client";

const SAMPLE_RESUME_USERNAMES = ["morganreyes", "alexramos"] as const;

export const useSampleResumePdf = (viewerQuery: string) => {
	const fallbackSrc = useMemo(() => `/resume.pdf${viewerQuery}`, [viewerQuery]);
	const [pdfSrc, setPdfSrc] = useState(fallbackSrc);

	useEffect(() => {
		let cancelled = false;

		const resolveSamplePdf = async () => {
			for (const username of SAMPLE_RESUME_USERNAMES) {
				const endpoint = `${apiBaseUrl}/resumes/${username}/pdf`;
				try {
					const response = await fetch(endpoint, { method: "HEAD" });
					if (response.ok) {
						if (!cancelled) {
							setPdfSrc(`${endpoint}${viewerQuery}`);
						}
						return;
					}
				} catch {
					// Keep trying other sample usernames, then fallback.
				}
			}
			if (!cancelled) {
				setPdfSrc(fallbackSrc);
			}
		};

		void resolveSamplePdf();

		return () => {
			cancelled = true;
		};
	}, [fallbackSrc, viewerQuery]);

	return pdfSrc;
};
