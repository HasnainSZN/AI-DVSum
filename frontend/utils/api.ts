const API_BASE_URL = "http://127.0.0.1:8000";

export async function getBackendMessage(): Promise<{ message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/`);
    if (!response.ok) {
      throw new Error("Failed to fetch data");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching data:", error);
    return { message: "Error fetching backend data" };
  }
}
