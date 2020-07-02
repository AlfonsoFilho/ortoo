import { actor } from "./index.mjs";

export default actor({
    print({ message }) {
        console.log('Echo:', message)
    }
})