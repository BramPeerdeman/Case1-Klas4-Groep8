const API_URL = import.meta.env.VITE_API_URL;

//  De Types: Wat sturen we en wat krijgen we terug?
export interface UpdateProfileData {
    nieuweGebruikersnaam?: string;
    nieuweEmail?: string;
    huidigWachtwoord?: string;
    nieuwWachtwoord?: string;
}

export interface UserProfile {
    gebruikersnaam: string;
    email: string;
}

//  Functie: Mijn gegevens ophalen (GET)
export async function getMyProfile(token: string): Promise<UserProfile> {
    const response = await fetch(`${API_URL}/api/Auth/me`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`, 
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error('Kan profielgegevens niet ophalen');
    }

    return response.json();
}

//  Functie: Profiel updaten (PUT)
export async function updateMyProfile(token: string, data: UpdateProfileData) {
    const response = await fetch(`${API_URL}/api/Auth/update-profiel`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    // We lezen de error tekst als het fout gaat 
    const result = await response.json();

    if (!response.ok) {
        
        if (Array.isArray(result)) {
            // Zoek of er een fout tussen zit over de gebruikersnaam
            const nameError = result.find((e: any) => e.code === 'InvalidUserName');
            
            if (nameError) {
                //Foutmelding voor ongeldige gebruikersnaam
                throw new Error("Gebruikersnaam mag alleen letters en cijfers bevatten (zonder spaties).");
            }

            // Andere fouten (bijv wachtwoord te kort)? Laat die gewoon zien
            const errorText = result.map((err: any) => err.description).join('\n');
            throw new Error(errorText);
        }

        const errorMessage = result.message || JSON.stringify(result) || 'Update mislukt';
        throw new Error(errorMessage);
    }

    return result;
}