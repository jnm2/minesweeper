export class Utils {
    static forceTensPlace(value: number): string
    {
        const str = value.toString();
        return str.length == 1 ? '0' + str : str;
    }

    static millisecondsToFriendlyFormat(duration: number): string {
        const totalSeconds = Math.ceil(duration / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds / 60) % 60);
        const seconds = totalSeconds % 60;

        return (hours > 0 
            ? hours + ':' + Utils.forceTensPlace(minutes)
            : minutes.toString()) + ':' + Utils.forceTensPlace(seconds);
    }
}
