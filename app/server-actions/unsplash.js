"use server";

export async function fetchUnsplashImageById(imageId) {
    if (!imageId) return { error: "Image ID is required" };

    const accessKey = process.env.UNSPLASH_ACCESS_KEY;

    try {
        const response = await fetch(
            `https://api.unsplash.com/photos/${imageId}?client_id=${accessKey}`
        );

        if (!response.ok) {
            throw new Error(`Unsplash API Error: ${response.statusText}`);
        }

        const data = await response.json();
        return data; // Return the full image object
    } catch (error) {
        return { error: error.message };
    }
}

export async function parseUnsplashText(text) {
    if(!text){
        return {
            title: 'Untitled',
            description: 'A picture is worth a thousand words. This picture does not need a description!',
        };
    }


    const titleMatch = text.match(/^"(.+?)"/);
    const title = titleMatch ? titleMatch[1] : "";

    let description = text;
    if (titleMatch) {
        description = description.replace(titleMatch[0], "").replace(/^\s*[–—]\s*/, "").trim();
    }

    return {
        title,
        description
    };
}

// export async function getMyUnsplashCollections() {
//     const accessToken = process.env.UNSPLASH_ACCESS_KEY;
//     const secretKey = process.env.UNSPLASH_ACCESS_KEY;
//     const username = process.env.UNSPLASH_USERNAME;
//
//     console.log("Unsplash Access Token:", process.env.UNSPLASH_ACCESS_KEY);
//     console.log("Unsplash Username:", process.env.UNSPLASH_USERNAME);
//
//
//     if (!accessToken || !username) {
//         throw new Error("Missing Unsplash Access Token or Username in environment variables.");
//     }
//
//     const url = `https://api.unsplash.com/users/${username}/collections`;
//
//     try {
//         const response = await fetch(url, {
//             method: "GET",
//             headers: {
//                 "Authorization": `Bearer ${accessToken}`,
//                 "Content-Type": "application/json",
//             },
//             cache: "no-store", // Ensures fresh data
//         });
//
//         if (!response.ok) {
//             throw new Error(`Failed to fetch collections: ${response.statusText}`);
//         }
//
//         return await response.json();
//     } catch (error) {
//         console.error("Error fetching Unsplash collections:", error);
//         return { error: "Failed to fetch your collections." };
//     }
// }



export async function getMyUnsplashCollections() {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  const username = "nashbrowns"; // Your Unsplash username

  if (!accessKey) {
    throw new Error("Missing Unsplash access key");
  }

  try {
    const response = await fetch(`https://api.unsplash.com/users/${username}/collections`, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
      // cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.statusText}`);
    }

    const collections = await response.json();
    return collections;
  } catch (error) {
    console.error("Error fetching Unsplash collections:", error);
    return [];
  }
}

export async function getPhotosInCollection(collectionId) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    throw new Error("Missing Unsplash access key");
  }

  try {
    const response = await fetch(`https://api.unsplash.com/collections/${collectionId}/photos`, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
      // cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.statusText}`);
    }

    const photos = await response.json();
    return photos;
  } catch (error) {
    console.error("Error fetching photos in collection:", error);
    return [];
  }
}

