import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Configuration
cloudinary.config({
	cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View API Keys' above to copy your API secret
});

interface CloudinaryUploadResult {
	public_id: string;
	bytes: number;
	duration?: number;
	[key: string]: any;
}

export async function POST(req: NextRequest) {
	const { userId } = auth();
	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	if (
		!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
		!process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ||
		!process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET
	) {
	}

	try {
		const formData = await req.formData();
		const file = formData.get("file") as File | null;
		const title = formData.get("title") as string;
		const description = formData.get("description") as string;
		const orignalSize = formData.get("orignalSize") as string;

		if (!file || !(file instanceof File)) {
			return NextResponse.json(
				{ error: "No file uploaded" },
				{ status: 400 }
			);
		}

		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);

		const result: CloudinaryUploadResult =
			await new Promise<CloudinaryUploadResult>((resolve, reject) => {
				const uploadStream = cloudinary.uploader.upload_stream(
					{
						folder: "downey-ai-uploads",
						resource_type: "video",
						transformation: [
							{ quality: "auto" },
							{ fetch_format: "mp4" },
						],
					},
					(error, result) => {
						if (error) {
							reject(error);
						} else {
							resolve(result as CloudinaryUploadResult);
						}
					}
				);
				uploadStream.end(buffer);
			});

		const video = await prisma.video.create({
			data: {
				title,
				description,
				orignalSize: orignalSize,
				publicId: result.public_id,
				compressedSize: String(result.bytes),
				duration: result.duration | 0,
			},
		});
	} catch (error) {
		console.error("Error uploading image:", error);
		return new NextResponse("Internal Server Error", { status: 500 });
	} finally {
		await prisma.$disconnect();
	}
}