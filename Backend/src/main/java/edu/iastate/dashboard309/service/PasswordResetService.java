package edu.iastate.dashboard309.service;

import edu.iastate.dashboard309.model.User;
import edu.iastate.dashboard309.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;

@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    private static final String CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    private static final int TEMP_PW_LENGTH = 8;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;

    @Value("${app.mail.from:309-dashboard@iastate.edu}")
    private String fromAddress;

    public PasswordResetService(UserRepository userRepository,
                                PasswordEncoder passwordEncoder,
                                JavaMailSender mailSender) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailSender = mailSender;
    }

    @Transactional
    public void sendTemporaryPassword(String netid) {
        User user = userRepository.findByNetid(netid)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No account found for NetID: " + netid));

        String tempPassword = generatePassword();
        user.setPassword(passwordEncoder.encode(tempPassword));
        userRepository.save(user);

        String to = netid + "@iastate.edu";
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(fromAddress);
        msg.setTo(to);
        msg.setSubject("Your temporary dashboard password");
        msg.setText(
            "Hi " + (user.getName() != null ? user.getName() : netid) + ",\n\n" +
            "Your temporary password for the Course Dashboard is:\n\n" +
            "    " + tempPassword + "\n\n" +
            "Log in at the dashboard and go to Profile → Change Password to set a new one.\n\n" +
            "If you didn't request this, you can ignore this email.\n"
        );

        try {
            mailSender.send(msg);
        } catch (MailException e) {
            log.error("Failed to send password reset email to {}: {}", to, e.getMessage());
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Could not send email — mail server may be unreachable. Contact your instructor.");
        }
    }

    private String generatePassword() {
        SecureRandom rng = new SecureRandom();
        StringBuilder sb = new StringBuilder(TEMP_PW_LENGTH);
        for (int i = 0; i < TEMP_PW_LENGTH; i++) {
            sb.append(CHARS.charAt(rng.nextInt(CHARS.length())));
        }
        return sb.toString();
    }
}
