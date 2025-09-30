#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@protocol NVActivityIndicatorAnimationDelegate <NSObject>
- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color;
- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier;
@end

NS_ASSUME_NONNULL_END
