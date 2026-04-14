const BUNNY_API_KEY = process.env.BUNNY_LIBRARY_API_KEY!
const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID!
const BUNNY_CDN_HOSTNAME = process.env.BUNNY_CDN_HOSTNAME!

const BASE_URL = `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`

export const BUNNY_STATUS_MAP: Record<number, string> = {
    0: 'processing', // created
    1: 'processing', // uploaded
    2: 'processing', // processing
    3: 'processing', // transcoding
    4: 'ready',      // finished
    5: 'failed',     // error
    6: 'failed',     // upload failed
}

export async function createBunnyVideo(title: string): Promise<{ guid: string }> {
    const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
            'AccessKey': BUNNY_API_KEY,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Bunny createVideo failed (${res.status}): ${text}`)
    }

    const data = await res.json()
    return { guid: data.guid }
}

export async function uploadToBunny(videoId: string, buffer: Buffer): Promise<void> {
    const res = await fetch(`${BASE_URL}/${videoId}`, {
        method: 'PUT',
        headers: {
            'AccessKey': BUNNY_API_KEY,
            'Content-Type': 'application/octet-stream',
        },
        body: new Uint8Array(buffer),
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Bunny upload failed (${res.status}): ${text}`)
    }
}

export async function getBunnyVideoStatus(videoId: string): Promise<{ status: string; encodeProgress: number }> {
    const res = await fetch(`${BASE_URL}/${videoId}`, {
        method: 'GET',
        headers: { 'AccessKey': BUNNY_API_KEY },
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Bunny getStatus failed (${res.status}): ${text}`)
    }

    const data = await res.json()
    return {
        status: BUNNY_STATUS_MAP[data.status] ?? 'processing',
        encodeProgress: data.encodeProgress ?? 0,
    }
}

export async function deleteBunnyVideo(videoId: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/${videoId}`, {
        method: 'DELETE',
        headers: { 'AccessKey': BUNNY_API_KEY },
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Bunny delete failed (${res.status}): ${text}`)
    }
}

export function getBunnyEmbedUrl(videoId: string): string {
    return `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${videoId}`
}

export function getBunnyThumbnailUrl(videoId: string): string {
    return `https://${BUNNY_CDN_HOSTNAME}/${videoId}/thumbnail.jpg`
}
