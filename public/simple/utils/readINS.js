export async function readINS() {
    try {
        let INSprompt = await fetch("instruction.txt").then((response) =>
            response.text()
        );
        console.log("fetch INSprompt successfully");
        return INSprompt
    }
    catch (e) {
        console.warn("fetch INSprompt failed");
        console.warn(e)
        return ''
    }
}