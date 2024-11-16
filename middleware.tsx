import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/signin", "/signup", "/", "/home"]);

const isPublicApiRoute = createRouteMatcher(["/api/videos"]);

export default clerkMiddleware((auth, req) => {
	const { userId } = auth();
	console.log("🚀 ~ clerkMiddleware ~ userId:", userId);
	const currentUrl = new URL(req.url);
	console.log("🚀 ~ clerkMiddleware ~ currentUrl:", currentUrl);
	const isAccessingDashboard = currentUrl.pathname === "/home";
	console.log(
		"🚀 ~ clerkMiddleware ~ isAccessingDashboard:",
		isAccessingDashboard
	);
	const isApiRequest = currentUrl.pathname.startsWith("/api");
	console.log("🚀 ~ clerkMiddleware ~ isApiRequest:", isApiRequest);

	if (userId && isPublicRoute(req) && !isAccessingDashboard) {
		return NextResponse.redirect(new URL("/home", req.url));
	}
	// not logged in
	if (!userId) {
		if (!isPublicRoute(req) && !isPublicApiRoute(req)) {
			return NextResponse.redirect(new URL("/signin", req.url));
		}
		if (isApiRequest && !isPublicApiRoute(req)) {
			return NextResponse.redirect(new URL("/signin", req.url));
		}
	}

	return NextResponse.next();
});

export const config = {
	matcher: [
		// Skip Next.js internals and all static files, unless found in search params
		"/((?!.*\\..*|_next).*)",
		"/",
		// Always run for API routes
		"/(api|trpc)(.*)",
	],
};
