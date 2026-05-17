import java.io.File;

public class PathCheck {
    public static void main(String[] args) {
        String[] paths = {
            "C:\\ElderSea\\libraries\\net\\minecraft\\client\\1.20.1-20230612.114412\\client-1.20.1-20230612.114412-srg.jar",
            "C:\\ElderSea\\libraries\\net\\minecraft\\client\\1.20.1-20230612.114412\\client-1.20.1-20230612.114412-extra.jar",
            "C:\\ElderSea\\libraries\\net\\minecraftforge\\forge\\1.20.1-47.3.0\\forge-1.20.1-47.3.0-client.jar"
        };
        for (String p : paths) {
            File f = new File(p);
            System.out.println("Checking " + p);
            System.out.println("  Exists: " + f.exists());
            System.out.println("  Can Read: " + f.canRead());
            System.out.println("  Length: " + f.length());
        }
    }
}
